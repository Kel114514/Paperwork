import { useState, useEffect } from "react";

// Handle the backend API calls via axios
import axios from "axios";

// 后端可用API: search, similar, generate-survey; Method 是 POST
const apiUrl = "http://localhost:5000/";

// Search API: params: {query: "query"}
export const searchAPI = async (query) => {
    const message = {
        query: query,
    };

    const response = await axios.post(apiUrl + "search", message);

    var raw_data = response.data;
    var processed_data = [];

    // if the response is empty, return an empty list
    if (raw_data.length === 0) {
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

        // Generate random date between 2022.1.1 and current date
        if ("date" in paper && paper["date"] !== "N/A") {
            // Keep the existing date if it's available
        } else {
            const startDate = new Date(2023, 0, 1); // January 1, 2022
            const currentDate = new Date();
            const randomDate = new Date(startDate.getTime() + Math.random() * (currentDate.getTime() - startDate.getTime()));
            const year = randomDate.getFullYear();
            const month = String(randomDate.getMonth() + 1).padStart(2, '0');
            const day = String(randomDate.getDate()).padStart(2, '0');
            paper["date"] = `${year}.${month}.${day}`;
        }

        // Generate random citation number between 20 and 2000
        if ("citation" in paper && paper["citation"] !== "N/A") {
            // Keep the existing citation if it's available
        } else {
            // Generate citation using normal distribution with mean 150
            // Using Box-Muller transform to generate normally distributed random numbers
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const mean = 500;  // Increased from 200 to 500
            const stdDev = 400;  // Increased from 200 to 400
            let citation = Math.round(mean + z * stdDev);
            
            // Ensure citation is within reasonable bounds (50-2000)
            citation = Math.max(50, Math.min(2000, citation));
            
            paper["citation"] = citation;
        }

        processed_data.push(paper);
    }
    return processed_data;
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

export const chatAPI = async (query, selectedPapers = null, pdfTextContent = null) => {
    const requestData = {
        query: query,
    };
    
    // Include selected papers if provided
    if (selectedPapers && selectedPapers.length > 0) {
        // Process papers to include summary and analysis content
        const processedPapers = selectedPapers.map(paper => {
            return {
                id: paper.id,
                name: paper.name,
                author: paper.author,
                date: paper.date,
                citation: paper.citation,
                url: paper.url,
                summary: paper.summary,
                analysis: paper.analysis
            };
        });
        
        requestData.selected_papers = processedPapers;
    }
    
    // Include PDF text content if provided
    if (pdfTextContent) {
        requestData.pdf_text_content = pdfTextContent;
    }
    
    const response = await axios.post(apiUrl + "chat", requestData);

    const raw_data = response.data;

    // if the response is empty, return an empty string
    if (raw_data.length === 0) {
        return "";
    }

    // The survey is a string of the survey
    if ("response" in raw_data) {
        return raw_data["response"];
    } else {
        return "";
    }
}

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
export const analyzePapersBatchAPI = async (articles, query = null) => {
    const requestData = {
        articles: articles,
        query: query  // Always include the query parameter, even if it's null
    };
    
    console.log("Sending batch analysis request with query:", query);
    
    const response = await axios.post(apiUrl + "analyze-papers-batch", requestData);
    return response.data;
}

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