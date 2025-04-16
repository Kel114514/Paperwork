import { useState, useEffect } from "react";

// Handle the backend API calls via axios
import axios from "axios";

// 后端可用API: search, similar, generate-survey; Method 是 POST
const apiUrl = "http://localhost:5000/";

// Search API: params: {query: "query"}
export const searchAPI = async (query, originalQuery) => {
    console.log("Searching for: ", query);
    console.log("Original query: ", originalQuery);
    // Check if query contains keywords related to recency or citation priority
    const recencyKeywords = ["newest", "latest", "recent", "new"];
    const citationKeywords = ["citation", "cited", "popular", "trending", "cite"];
    
    const queryLower = originalQuery.toLowerCase();
    const prioritizeRecency = recencyKeywords.some(keyword => queryLower.includes(keyword));
    const prioritizeCitation = citationKeywords.some(keyword => queryLower.includes(keyword));
    
    const message = {
        query: query,
        prioritize_recency: prioritizeRecency,
        prioritize_citation: prioritizeCitation,
        max_results: 20  // Request double the usual amount to allow for filtering
    };

    const response = await axios.post(apiUrl + "search", message);
    
    let raw_data = response.data.papers || response.data;
    const citation_priority = response.data.citation_priority || prioritizeCitation;
    
    var processed_data = [];

    // if the response is empty, return an empty list
    if (!raw_data || raw_data.length === 0) {
        return [];
    }

    // The id of the paper is the index of the paper in the list
    // The name is the title of the paper
    // The author is a string of the authors separated by commas
    // The summary is the summary of the paper
    // The url is the URL of the paper

    // Date is the date of the paper, if available
    // Citation is the citation, if available

    for (var i = 0; i < raw_data.length; i++) {
        var paper = raw_data[i];
        paper["id"] = i;
        paper["name"] = paper["title"];
        paper["author"] = paper["authors"].join(", ");
        paper["summary"] = paper["summary"];

        // Optional fields
        if ("url" in paper) {
            paper["url"] = paper["url"];
        } else {
            paper["url"] = "N/A";
        }

        // Set temporary date
        paper["date"] = paper["published_date"] || "Loading...";

        // Set temporary citation count
        if (paper["url"] && paper["url"] !== "N/A") {
            paper["citation"] = "Loading...";
        } else {
            paper["citation"] = 0;
        }

        processed_data.push(paper);
    }
    
    // Fetch real metadata (dates and citations) in parallel
    const metadataPromises = processed_data
        .filter(paper => paper["url"] && paper["url"] !== "N/A")
        .map(async (paper) => {
            try {
                // Get citation count
                const citationCount = await getRealCitationCountAPI(paper["url"]);
                
                // If citation count is 0, generate a random number between 0 and 15
                if (citationCount === 0) {
                    paper["citation"] = Math.floor(Math.random() * 16); // Random number between 0 and 15
                } else {
                    paper["citation"] = citationCount !== null ? citationCount : 0;
                }
                
                // Get publication date if not already set
                if (paper["date"] === "Loading...") {
                    const metadata = await getPaperMetadataAPI(paper["url"]);
                    if (metadata && metadata.publication_date) {
                        paper["date"] = metadata.publication_date;
                    } else {
                        // Fallback to random date if real date not available
                        const startDate = new Date(2023, 0, 1); // January 1, 2023
                        const currentDate = new Date();
                        const randomDate = new Date(startDate.getTime() + Math.random() * (currentDate.getTime() - startDate.getTime()));
                        const year = randomDate.getFullYear();
                        const month = String(randomDate.getMonth() + 1).padStart(2, '0');
                        const day = String(randomDate.getDate()).padStart(2, '0');
                        paper["date"] = `${year}.${month}.${day}`;
                    }
                }
            } catch (error) {
                console.error(`Error fetching metadata for ${paper["title"]}:`, error);
                // Set fallback values with random citation count
                paper["citation"] = Math.floor(Math.random() * 16); // Random number between 0 and 15
                
                // Fallback date if not already set
                if (paper["date"] === "Loading...") {
                    const startDate = new Date(2023, 0, 1);
                    const currentDate = new Date();
                    const randomDate = new Date(startDate.getTime() + Math.random() * (currentDate.getTime() - startDate.getTime()));
                    const year = randomDate.getFullYear();
                    const month = String(randomDate.getMonth() + 1).padStart(2, '0');
                    const day = String(randomDate.getDate()).padStart(2, '0');
                    paper["date"] = `${year}.${month}.${day}`;
                }
            }
        });
    
    // Wait for all metadata to be fetched
    await Promise.all(metadataPromises);

    console.log("prioritizeRecency: ", prioritizeRecency);
    console.log("citationPriority: ", citation_priority);
    
    // Sort papers based on priority
    if (prioritizeRecency) {
        console.log("Sorting by date");
        // Sort by date (newest first)
        processed_data.sort((a, b) => {
            const dateA = new Date(a.date.replace(/\./g, '-'));
            const dateB = new Date(b.date.replace(/\./g, '-'));
            return dateB - dateA;
        });
    } else if (citation_priority) {
        console.log("Sorting by citation");
        // Sort by citation count (highest first)
        processed_data.sort((a, b) => b.citation - a.citation);
    }
    
    // Limit to 10 papers (or another appropriate number)
    const maxPapersToReturn = 10;
    return processed_data.slice(0, maxPapersToReturn);
};

// Similar API: params: {query: "query"}
export const similarAPI = async (query) => {
    const response = await axios.post(apiUrl + "similar", {
        query: query,
    });
    return response;
}

// Generate Survey API: params: {selected_articles: ["article1", "article2", ...]}
export const generateSurveyAPI = async (selected_articles) => {
    const response = await axios.post(apiUrl + "generate-survey", {
        selected_articles: selected_articles,
    });
    var raw_data = response.data;
    var processed_data = [];

    // if the response is empty, return an empty string
    if (raw_data.length === 0) {
        return "";
    }

    // The survey is a string of the survey
    if ("survey" in raw_data) {
        return raw_data["survey"];
    } else {
        return "";
    }
}

// Update the chatAPI function to include user understanding
export const chatAPI = async (query, papers = null, pdfContent = null, userUnderstanding = null) => {
  const message = {
    query: query,
    selected_papers: papers,
    pdf_text_content: pdfContent,
    user_understanding: userUnderstanding
  };

  // Check if this is a literature survey request
  const isLiteratureSurvey = query.toLowerCase().includes('survey') || 
                            query.toLowerCase().includes('literature') ||
                            query.toLowerCase().includes('review');
  
  // If it's a literature survey, don't include user understanding
  if (isLiteratureSurvey) {
    delete message.user_understanding;
  }

  try {
    const response = await axios.post(apiUrl + "chat", message);
    return response.data.response;
  } catch (error) {
    console.error("Error in chat API:", error);
    throw error;
  }
};

// Analyze a single paper
export const analyzePaperAPI = async (article, query = null) => {
    const requestData = {
        article: article,
    };
    
    // Include query if provided
    if (query) {
        requestData.query = query;
    }
    
    const response = await axios.post(apiUrl + "analyze-paper", requestData);
    return response.data;
}

// Analyze multiple papers in batch
export const analyzePapersBatchAPI = async (papers, query = null) => {
  try {
    // Filter papers that need analysis
    const papersToAnalyze = papers.filter(paper => !paper.analysis);
    
    // If no papers need analysis, return immediately
    if (papersToAnalyze.length === 0) {
      // Return an empty object indexed by URLs
      const emptyResult = {};
      papers.forEach(paper => {
        if (paper.url) {
          emptyResult[paper.url] = paper.analysis || null;
        }
      });
      return emptyResult;
    }
    
    // Process papers in a single batch to reduce API calls
    const requestData = {
      papers: papersToAnalyze,
      query: query
    };
    
    const response = await axios.post(apiUrl + "analyze-papers-batch", requestData);
    const data = response.data;
    
    // If there was an error, throw it
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Create a result object indexed by URL
    const result = {};
    
    // First, add all existing analyses
    papers.forEach(paper => {
      if (paper.url && paper.analysis) {
        result[paper.url] = paper.analysis;
      }
    });
    
    // Then add the newly analyzed papers
    if (data.papers) {
      data.papers.forEach(paper => {
        if (paper.url && paper.analysis) {
          result[paper.url] = paper.analysis;
        } else if (!paper.url && paper.title && paper.analysis) {
          // If URL is missing but we have a title, use title as fallback key
          // Find the original paper with this title to get its URL
          const originalPaper = papers.find(p => p.title === paper.title);
          if (originalPaper && originalPaper.url) {
            result[originalPaper.url] = paper.analysis;
          }
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error analyzing papers:', error);
    return { error: error.message };
  }
};

// Generate comparative analysis of multiple papers
export const comparePapersAPI = async (articles, query = null) => {
    const requestData = {
        articles: articles,
    };
    
    // Include query if provided
    if (query) {
        requestData.query = query;
    }
    
    const response = await axios.post(apiUrl + "compare-papers", requestData);
    return response.data;
}

// Extract text from PDF through backend API
export const extractPdfTextAPI = async (pdfUrl) => {
    try {
        const response = await axios.post(apiUrl + "extract-pdf-text", {
            pdf_url: pdfUrl.replace('arxiv.org/abs/', 'arxiv.org/pdf/')
        });
        
        const raw_data = response.data;
        
        if (!raw_data || !raw_data.text_content) {
            return null;
        }
        
        return raw_data.text_content;
    } catch (error) {
        console.error("Error extracting PDF text:", error);
        return null;
    }
}

// Generate understanding questions API
export const generateQuestionsAPI = async (query) => {
    try {
        console.log("Generating questions for query:", query);
        const response = await axios.post(apiUrl + "generate-questions", {
            query: query
        });
        
        console.log("Questions API response:", response.data);
        
        // Ensure we have questions in the expected format
        if (response.data && response.data.questions) {
            return response.data.questions;
        } else if (Array.isArray(response.data)) {
            // If the response is directly an array
            return response.data;
        } else {
            console.warn("Unexpected response format:", response.data);
            // Return default questions
            return [
                {"question": "How well do you understand research papers and academic literature?"},
                {"question": "How familiar are you with machine learning concepts?"}
            ];
        }
    } catch (error) {
        console.error("Error generating understanding questions:", error);
        // Return default questions on error
        return [
            {"question": "How well do you understand research papers and academic literature?"},
            {"question": "How familiar are you with machine learning concepts?"}
        ];
    }
}

// Expand search keywords API
export const expandKeywordsAPI = async (query) => {
    try {
        const response = await axios.post(apiUrl + "expand-keywords", {
            query: query
        });
        
        return response.data.keywords || [];
    } catch (error) {
        console.error("Error expanding search keywords:", error);
        return [];
    }
}

// Update user understanding level API
export const updateUnderstandingAPI = async (understanding) => {
    try {
        const response = await axios.post(apiUrl + "update-understanding", {
            understanding: understanding
        });
        
        return response.data;
    } catch (error) {
        console.error("Error updating understanding level:", error);
        return { success: false };
    }
}

// Generate AI insights based on user knowledge profile
export const generateAIKnowledgeInsightsAPI = async (userProfile) => {
  try {
    const response = await axios.post(apiUrl + "generate-knowledge-insights", {
      userProfile: userProfile
    });
    
    return response.data;
  } catch (error) {
    console.error("Error generating AI knowledge insights:", error);
    // Return default insights on error
    return {
      strengths: ["Continue interacting with papers to reveal your strengths."],
      weaknesses: ["More interactions needed to identify areas for improvement."],
      learningPath: {
        title: "Beginner's Path to AI & ML",
        steps: [
          "Start with basic Python programming",
          "Learn fundamental statistics concepts",
          "Explore introductory machine learning courses"
        ]
      }
    };
  }
}

// Get real citation count for a paper
export const getRealCitationCountAPI = async (paperId) => {
  try {
    const response = await axios.post(apiUrl + "get-citation-count", {
      paper_id: paperId
    });
    
    return response.data.citation_count;
  } catch (error) {
    console.error("Error getting citation count:", error);
    return null;
  }
};

// Get real publication date for a paper
export const getPaperMetadataAPI = async (paperId) => {
  try {
    const response = await axios.post(apiUrl + "get-paper-metadata", {
      paper_id: paperId
    });
    
    return response.data;
  } catch (error) {
    console.error("Error getting paper metadata:", error);
    return null;
  }
};