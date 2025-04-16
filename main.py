import os
import json
import arxiv
from openai import OpenAI
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
from io import BytesIO
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
import faiss
import dotenv
import hashlib
from urllib.parse import quote


app = Flask(__name__)
CORS(app)

# Load environment variables from .env file
dotenv.load_dotenv(dotenv_path=".env")

# Check if OpenAI API key is available
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    print("Warning: OPENAI_API_KEY not found in environment variables. Please set it in the .env file.")

# Initialize SentenceTransformer model for embeddings
model = SentenceTransformer('paraphrase-MiniLM-L6-v2')

# Get the actual embedding dimension from the model
sample_text = "This is a sample text to determine the embedding dimension."
embedding = model.encode([sample_text])[0]
dim = embedding.shape[0]  # Get the actual dimension from the model

# Initialize FAISS index for storing vectors with the correct dimension
index = faiss.IndexFlatL2(dim)

# Dictionary to store articles metadata and embeddings
articles_db = {}

# Create a paper analysis cache
paper_analysis_cache = {}

# Helper function to generate a cache key for a paper
def get_paper_cache_key(paper):
    # Create a unique identifier based on title and authors
    key_data = f"{paper.get('title', '')}-{paper.get('authors', '')}"
    return hashlib.md5(key_data.encode()).hexdigest()

# Check cache before analyzing
def get_cached_analysis(paper):
    cache_key = get_paper_cache_key(paper)
    return paper_analysis_cache.get(cache_key)

# Store analysis in cache
def cache_paper_analysis(paper, analysis):
    cache_key = get_paper_cache_key(paper)
    paper_analysis_cache[cache_key] = analysis
    # Limit cache size to prevent memory issues
    if len(paper_analysis_cache) > 1000:
        # Remove oldest entries
        for k in list(paper_analysis_cache.keys())[:100]:
            paper_analysis_cache.pop(k, None)

# Function to search for articles using the arxiv API
def search_articles(query, max_results=10):
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.Relevance
    )
    
    results = list(search.results())
    
    # Process results
    processed_results = []
    for result in results:
        processed_results.append({
            'title': result.title,
            'summary': result.summary,
            'url': result.entry_id,
            'authors': [author.name for author in result.authors],
            'published_date': result.published.strftime('%Y-%m-%d')
        })
    
    # If citation priority is set, we'll need to sort by citation count
    # This will be handled by the frontend since we need to fetch citation counts there
    
    # Limit to requested max_results
    return processed_results[:max_results]


# Function to add articles to FAISS index
def add_article_to_db(article):
    text = article['summary']
    embedding = model.encode([text])[0]
    articles_db[article['url']] = article
    index.add(np.array([embedding], dtype=np.float32))


# Route for searching articles, using POST instead of GET for the query
@app.route('/search', methods=['POST'])
def search():
    print(request.json)
    
    query = request.json.get('query')
    prioritize_recency = request.json.get('prioritize_recency', False)
    prioritize_citation = request.json.get('prioritize_citation', False)
    max_results = request.json.get('max_results', 10)

    print(f"Query: {query}, Prioritize Recency: {prioritize_recency}, Prioritize Citation: {prioritize_citation}")

    if not query:
        return jsonify({"error": "Query is required"}), 400
    
    articles = search_articles(query, max_results=max_results)
    
    # If prioritizing recency, sort by publication date
    if prioritize_recency:
        articles.sort(key=lambda x: x.get('published_date', '1970-01-01'), reverse=True)
    
    # Add articles to the DB and index if they are not already present
    for article in articles:
        if article['url'] not in articles_db:
            add_article_to_db(article)
    
    # Return citation priority flag to frontend
    return jsonify({
        "papers": articles,
        "citation_priority": prioritize_citation
    })


# Route for retrieving similar articles (search in the vector space)
@app.route('/similar', methods=['POST'])
def similar():
    query = request.json.get('query')
    if not query:
        return jsonify({"error": "Query is required"}), 400
    # Encode the query to get its vector
    query_vector = model.encode([query])[0]
    # Search for similar articles in FAISS
    _, indices = index.search(np.array([query_vector], dtype=np.float32), k=5)
    similar_articles = [articles_db[list(articles_db.keys())[i]] for i in indices[0]]
    return jsonify(similar_articles)


def generate_literature_survey(selected_articles, model_name='gpt-4o', history=[]):
    """
    Generate a comprehensive literature survey based on selected articles.
    
    Parameters:
        selected_articles: List of articles with their details and analysis
        model_name: The model to use for generation
        history: Optional chat history to enhance context
    
    Returns:
        A string containing the generated literature survey
    """
    # Format the articles information for the prompt
    articles_text = ""
    for i, article in enumerate(selected_articles):
        title = article.get('title', '')
        authors = article.get('authors', '')
        summary = article.get('summary', '')
        url = article.get('url', '')
        date = article.get('date', 'N/A')
        citation = article.get('citation', 'N/A')
        
        # Extract analysis information if available
        analysis_text = ""
        if 'analysis' in article and article['analysis']:
            analysis = article['analysis']
            relevance = analysis.get('relevance', {})
            technical = analysis.get('technical_innovation', {})
            feasibility = analysis.get('feasibility', {})
            
            analysis_text = f"""
            Analysis:
            - Relevance: {relevance.get('rating', 'N/A')}/10 - {relevance.get('explanation', 'No explanation available')}
            - Technical Innovation: {technical.get('rating', 'N/A')}/10 - {technical.get('explanation', 'No explanation available')}
            - Feasibility: {feasibility.get('rating', 'N/A')}/10 - {feasibility.get('explanation', 'No explanation available')}
            """
        
        articles_text += f"""
        Article {i+1}:
        Title: {title}
        Authors: {authors}
        Publication Date: {date}
        Citation Count: {citation}
        URL: {url}
        Abstract: {summary}
        {analysis_text}
        """
    
    prompt = f"""
    Write a comprehensive literature survey based on the following selected articles.
    The literature survey should include:
    
    1. Introduction: Provide an overview of the research area and the significance of the selected papers.
    
    2. Main Themes: Identify and discuss the main themes, methodologies, and findings across the papers.
    
    3. Comparative Analysis: Compare and contrast the approaches, strengths, and limitations of each paper.
       Consider publication dates and citation counts when discussing the impact and relevance of each paper.
    
    4. Synthesis: Synthesize the findings to identify common patterns, gaps, and potential future research directions.
    
    5. Conclusion: Summarize the key insights and contributions of the literature survey.
    
    Selected Articles:
    {articles_text}
    
    Based on the above information, please generate a high-quality literature survey that integrates the findings from all selected papers.
    """
    
    client = OpenAI(
        base_url="https://api.gptsapi.net/v1",
        api_key=openai_api_key
    )
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}] + history,
            max_tokens=2000,
            temperature=0.3
        )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating literature survey: {str(e)}"


# Route for generating literature survey
@app.route('/generate-survey', methods=['POST'])
def generate_survey():
    selected_articles = request.json.get('selected_articles')
    if not selected_articles:
        return jsonify({"error": "Selected articles are required"}), 400

    # Generate the literature survey
    survey = generate_literature_survey(selected_articles)

    return jsonify({"survey": survey})


def chat_with_agent(query: str, history: list = [], model_name: str = 'gpt-4o-mini'):
    """
    Regular chat function that maintains conversation history
    
    Parameters:
        query: User's current question/input
        history: List of previous conversation messages
        model_name: The model to use for chat
    """
    client = OpenAI(
        base_url="https://api.gptsapi.net/v1",
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Combine history with current query
    messages = history + [{"role": "user", "content": query}]
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=800,
            temperature=0.7  
        )
        return {
            "response": response.choices[0].message.content,
            "history": messages + [{"role": "assistant", "content": response.choices[0].message.content}]
        }
    except Exception as e:
        return {"error": str(e)}


def analyze_paper(article, model_name='gpt-4o-mini', all_articles=None, query=None):
    """
    Analyze a paper for relevance, technical innovation, and feasibility with structured results and ratings.
    Uses a comparative approach to create more differentiation between papers.
    
    Parameters:
        article: The article to analyze
        model_name: The model to use for analysis
        all_articles: List of all articles to compare against (for relative ranking)
        query: Optional query to evaluate relevance against
    
    Returns:
        A dictionary containing the analysis results with ratings
    """
    title = article.get('title', '')
    summary = article.get('summary', '')

    print("Single paper query: ", query)
    print("Single paper query type: ", type(query))
    
    # Check if API key is available
    if not openai_api_key:
        return {
            "error": "OpenAI API key not found. Please set OPENAI_API_KEY in the .env file.",
            "relevance": {"rating": 0, "explanation": "Analysis not available due to missing API key"},
            "technical_innovation": {"rating": 0, "explanation": "Analysis not available due to missing API key"},
            "feasibility": {"rating": 0, "explanation": "Analysis not available due to missing API key"}
        }
    
    # If we have other articles to compare against, use a comparative approach
    if all_articles and len(all_articles) > 1:
        # Create a prompt that includes information about other papers for comparison
        other_papers = [a for a in all_articles if a.get('url') != article.get('url')]
        other_papers_text = ""
        
        if other_papers:
            other_papers_text = "\n\nFor comparison, here are other papers in the dataset:\n"
            for i, other_paper in enumerate(other_papers[:5]):  # Limit to 5 other papers to avoid token limits
                other_papers_text += f"\nPaper {i+1}:\nTitle: {other_paper.get('title', '')}\nAbstract: {other_paper.get('summary', '')}\n"
        
        # Create the relevance evaluation part based on whether a query is provided
        relevance_evaluation = ""
        if query:
            relevance_evaluation = f"""
            1. Relevance to Query: Evaluate how relevant this paper is to the following query: "{query}".
               Provide a rating out of 10 and explain why. Create meaningful differentiation between papers.
            """
        else:
            relevance_evaluation = """
            1. Relevance (相关度): Evaluate how relevant this paper is to its field compared to the other papers. 
               Provide a rating out of 10 and explain why. Create meaningful differentiation between papers.
            """
        
        prompt = f"""
        Analyze the following academic paper and provide a structured evaluation with ratings out of 10.
        IMPORTANT: Your ratings should reflect how this paper compares to the other papers provided.
        Create meaningful differentiation in your ratings based on the paper's relative strengths and weaknesses.
        
        Paper to analyze:
        Title: {title}
        Abstract: {summary}
        {other_papers_text}
        
        Please provide a detailed analysis with the following components:
        
        {relevance_evaluation}
        
        2. Technical Innovation Points (技术创新点): Identify and evaluate the key technical innovations in this paper compared to others.
           Provide a rating out of 10 and explain why. Ensure your rating reflects the paper's relative innovation level.
        
        3. Feasibility/Operability (必要条件/可操作性): Assess how feasible and practical the proposed methods or solutions are compared to other papers.
           Provide a rating out of 10 and explain why. Differentiate clearly between papers with different levels of feasibility.
        
        Format your response as a JSON object with the following structure:
        {{
            "relevance": {{
                "rating": X,
                "explanation": "detailed explanation with comparative analysis"
            }},
            "technical_innovation": {{
                "rating": X,
                "explanation": "detailed explanation with comparative analysis"
            }},
            "feasibility": {{
                "rating": X,
                "explanation": "detailed explanation with comparative analysis"
            }}
        }}
        
        Ensure your response is valid JSON that can be parsed.
        """
    else:
        # Create the relevance evaluation part based on whether a query is provided
        relevance_evaluation = ""
        if query:
            relevance_evaluation = f"""
            1. Relevance to Query: Evaluate how relevant this paper is to the following query: "{query}".
               Provide a rating out of 10 and explain why.
            """
        else:
            relevance_evaluation = """
            1. Relevance (相关度): Evaluate how relevant this paper is to its field. Provide a rating out of 10 and explain why.
            """
        
        # Original prompt for single paper analysis
        prompt = f"""
        Analyze the following academic paper and provide a structured evaluation with ratings out of 10:
        
        Title: {title}
        Abstract: {summary}
        
        Please provide a detailed analysis with the following components:
        
        {relevance_evaluation}
        
        2. Technical Innovation Points (技术创新点): Identify and evaluate the key technical innovations in this paper. Provide a rating out of 10 and explain why.
        
        3. Feasibility/Operability (必要条件/可操作性): Assess how feasible and practical the proposed methods or solutions are. Provide a rating out of 10 and explain why.
        
        Format your response as a JSON object with the following structure:
        {{
            "relevance": {{
                "rating": X,
                "explanation": "detailed explanation"
            }},
            "technical_innovation": {{
                "rating": X,
                "explanation": "detailed explanation"
            }},
            "feasibility": {{
                "rating": X,
                "explanation": "detailed explanation"
            }}
        }}
        
        Ensure your response is valid JSON that can be parsed.
        """
    
    client = OpenAI(
        base_url="https://api.gptsapi.net/v1",
        api_key=openai_api_key
    )
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        # Parse the JSON response
        analysis = json.loads(response.choices[0].message.content)
        return analysis
    except Exception as e:
        return {"error": str(e)}


@app.route('/analyze-paper', methods=['POST'])
def analyze_paper_endpoint():
    """
    Endpoint to analyze a paper for relevance, technical innovation, and feasibility.
    """
    data = request.json
    if not data or 'article' not in data:
        return jsonify({"error": "Article data is required"}), 400
    
    article = data['article']
    model_name = data.get('model', 'gpt-4o-mini')
    query = data.get('query', None)  # Get the query parameter if provided
    
    analysis = analyze_paper(article, model_name, query=query)
    
    if "error" in analysis:
        return jsonify(analysis), 500
    
    return jsonify(analysis)


@app.route('/analyze-papers-batch', methods=['POST'])
def analyze_papers_batch():
    data = request.json
    papers = data.get('papers', [])
    query = data.get('query')
    print("Batch query from request:", query)
    print("Batch query type:", type(query))
    model_name = data.get('model', 'gpt-4o-mini')
    
    if not papers:
        return jsonify({"error": "No papers provided"}), 400
    
    # Create a cache to avoid re-analyzing papers
    paper_cache = {}
    papers_to_analyze = []
    
    # Check which papers need analysis
    for paper in papers:
        paper_id = paper.get('url') or paper.get('title')
        if not paper.get('analysis'):
            papers_to_analyze.append(paper)
        else:
            # Keep already analyzed papers in the cache
            paper_cache[paper_id] = paper['analysis']
    
    # If all papers are already analyzed, return immediately
    if not papers_to_analyze:
        return jsonify({"papers": papers})
    
    # Prepare a consolidated prompt for all papers
    consolidated_prompt = "Analyze the following papers"
    if query:
        consolidated_prompt += f" based on the query: {query}"
    consolidated_prompt += ". For each paper, provide a detailed analysis with ratings.\n\n"

    # Add papers to the prompt
    for i, paper in enumerate(papers_to_analyze):
        consolidated_prompt += f"Paper {i+1}: {paper['title']}\n"
        consolidated_prompt += f"Authors: {paper.get('authors', '')}\n"
        consolidated_prompt += f"Abstract: {paper.get('summary', '')}\n\n"

    # Create the relevance evaluation part based on whether a query is provided
    relevance_evaluation = ""
    if query:
        relevance_evaluation = f"""
        1. Relevance to Query: Evaluate how relevant each paper is to the query: "{query}".
           Provide a rating out of 10 and explain why with specific details from the paper.
        """
    else:
        relevance_evaluation = """
        1. Relevance (相关度): Evaluate how relevant each paper is to its field compared to the others.
           Provide a rating out of 10 and explain why with specific details from the paper.
        """

    # Add instructions for comparative analysis
    consolidated_prompt += f"""
    IMPORTANT: Compare these papers against each other and create meaningful differentiation in your ratings.
    - Do not give all papers similar ratings
    - Highlight the relative strengths and weaknesses of each paper compared to the others
    - Use the full rating scale (0-10) to show clear distinctions between papers
    - Ensure your explanations justify why one paper received a higher or lower rating than another

    Please provide a detailed analysis with the following components for each paper:

    {relevance_evaluation}

    2. Technical Innovation Points (技术创新点): Identify and evaluate the key technical innovations in each paper compared to others.
       Provide a rating out of 10 and explain why. Ensure your rating reflects each paper's relative innovation level.

    3. Feasibility/Operability (必要条件/可操作性): Assess how feasible and practical the proposed methods or solutions are compared to other papers.
       Provide a rating out of 10 and explain why. Differentiate clearly between papers with different levels of feasibility.

    4. Summary: Provide a brief summary of each paper's main contributions.

    5. Key Contributions: List the key contributions of each paper.

    6. Strengths: List the main strengths of each paper.

    7. Weaknesses: List the main weaknesses of each paper.
    """

    # Align the format with analyze_paper's format
    consolidated_prompt += "Provide your analysis in the following JSON format for each paper:\n"
    consolidated_prompt += """
    {
      "papers": [
        {
          "title": "Paper title",
          "relevance": {
            "rating": 0-10,
            "explanation": "detailed explanation with comparative assessment"
          },
          "technical_innovation": {
            "rating": 0-10,
            "explanation": "detailed explanation with comparative assessment"
          },
          "feasibility": {
            "rating": 0-10,
            "explanation": "detailed explanation with comparative assessment"
          },
          "summary": "Brief summary of the paper",
          "key_contributions": ["contribution1", "contribution2", ...],
          "strengths": ["strength1", "strength2", ...],
          "weaknesses": ["weakness1", "weakness2", ...]
        },
        ...
      ]
    }
    """
    
    # Make a single API call for all papers
    client = OpenAI(
        base_url="https://api.gptsapi.net/v1",
        api_key=openai_api_key
    )
    
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": "You are a research assistant that analyzes academic papers in computer science and AI."},
            {"role": "user", "content": consolidated_prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    # Parse the response
    analysis_results = json.loads(response.choices[0].message.content)
    
    # Map the analysis results back to the original papers
    for i, paper in enumerate(papers_to_analyze):
        if i < len(analysis_results.get('papers', [])):
            paper_analysis = analysis_results['papers'][i]
            
            # Ensure the analysis has the same structure as analyze_paper
            paper['analysis'] = {
                "relevance": paper_analysis.get("relevance", {
                    "rating": 5,
                    "explanation": "No relevance analysis available"
                }),
                "technical_innovation": paper_analysis.get("technical_innovation", {
                    "rating": 5,
                    "explanation": "No technical innovation analysis available"
                }),
                "feasibility": paper_analysis.get("feasibility", {
                    "rating": 5,
                    "explanation": "No feasibility analysis available"
                }),
                "summary": paper_analysis.get("summary", "No summary available"),
                "key_contributions": paper_analysis.get("key_contributions", []),
                "strengths": paper_analysis.get("strengths", []),
                "weaknesses": paper_analysis.get("weaknesses", [])
            }
        else:
            # Fallback if the API didn't return analysis for all papers
            paper['analysis'] = {
                "relevance": {
                    "rating": 5,
                    "explanation": "Analysis not available"
                },
                "technical_innovation": {
                    "rating": 5,
                    "explanation": "Analysis not available"
                },
                "feasibility": {
                    "rating": 5,
                    "explanation": "Analysis not available"
                },
                "summary": "Analysis not available",
                "key_contributions": [],
                "strengths": [],
                "weaknesses": []
            }
    
    # Update all papers with their analysis
    for paper in papers:
        paper_id = paper.get('url') or paper.get('title')
        if paper_id in paper_cache:
            paper['analysis'] = paper_cache[paper_id]
    
    return jsonify({"papers": papers})


def generate_comparative_analysis(articles, model_name='gpt-4o-mini', query=None):
    """
    Generate a comparative analysis of multiple papers with ratings.
    
    Parameters:
        articles: List of articles to compare
        model_name: The model to use for analysis
        query: Optional query to evaluate relevance against
    
    Returns:
        A dictionary containing the comparative analysis
    """
    # First, get individual analyses for each paper
    analyses = {}
    for article in articles:
        analyses[article['url']] = analyze_paper(article, query=query, all_articles=articles)
    
    # Prepare the data for the comparative analysis
    papers_data = []
    for article in articles:
        url = article.get('url', '')
        if url and url in analyses and "error" not in analyses[url]:
            papers_data.append({
                "title": article.get('title', ''),
                "url": url,
                "analysis": analyses[url]
            })
    
    if not papers_data:
        return {"error": "No valid analyses found for the provided articles"}
    
    # Create a prompt for the comparative analysis
    papers_info = "\n\n".join([
        f"Paper {i+1}: {paper['title']}\n"
        f"Relevance: {paper['analysis']['relevance']['rating']}/10 - {paper['analysis']['relevance']['explanation']}\n"
        f"Technical Innovation: {paper['analysis']['technical_innovation']['rating']}/10 - {paper['analysis']['technical_innovation']['explanation']}\n"
        f"Feasibility: {paper['analysis']['feasibility']['rating']}/10 - {paper['analysis']['feasibility']['explanation']}"
        for i, paper in enumerate(papers_data)
    ])
    
    # Add query context if provided
    query_context = ""
    if query:
        query_context = f"\n\nThis analysis was performed in the context of the following query: \"{query}\". The relevance ratings reflect how well each paper addresses this specific query."
    
    prompt = f"""
    Based on the following analyses of multiple academic papers, provide a comprehensive comparative analysis:
    
    {papers_info}
    {query_context}
    
    Please provide a detailed comparative analysis with the following components:
    
    1. Overall Comparison: Compare the papers in terms of relevance, technical innovation, and feasibility.
    
    2. Strengths and Weaknesses: Identify the strengths and weaknesses of each paper compared to the others.
    
    3. Synthesis: Synthesize the findings to identify common themes, gaps, and potential future research directions.
    
    Format your response as a JSON object with the following structure:
    {{
        "overall_comparison": "detailed comparison text",
        "strengths_weaknesses": [
            {{
                "paper_title": "title of paper",
                "strengths": ["strength 1", "strength 2", ...],
                "weaknesses": ["weakness 1", "weakness 2", ...]
            }},
            ...
        ],
        "synthesis": "synthesis text"
    }}
    
    Ensure your response is valid JSON that can be parsed.
    """
    
    client = OpenAI(
        base_url="https://api.gptsapi.net/v1",
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        # Parse the JSON response
        comparative_analysis = json.loads(response.choices[0].message.content)
        
        # Add the individual analyses to the result
        comparative_analysis["individual_analyses"] = analyses
        
        return comparative_analysis
    except Exception as e:
        return {"error": str(e)}


@app.route('/compare-papers', methods=['POST'])
def compare_papers():
    data = request.json
    papers = data.get('papers', [])
    query = data.get('query', '')
    history = data.get('history', [])
    model_name = data.get('model', 'gpt-4o-mini')
    
    if not papers or len(papers) < 2:
        return jsonify({"error": "At least two papers are required for comparison"}), 400
    
    try:
        # Extract only the necessary information from each paper
        paper_summaries = []
        for paper in papers:
            summary = {
                "title": paper.get('title', ''),
                "authors": paper.get('authors', ''),
                "summary": paper.get('summary', '')
            }
            
            # Include analysis if available
            if 'analysis' in paper and paper['analysis']:
                summary['key_contributions'] = paper['analysis'].get('key_contributions', [])
                summary['strengths'] = paper['analysis'].get('strengths', [])
                summary['weaknesses'] = paper['analysis'].get('weaknesses', [])
            
            paper_summaries.append(summary)
        
        # Create a focused prompt for comparison
        comparison_prompt = f"Compare the following papers in relation to the query: '{query}'\n\n"
        
        for i, paper in enumerate(paper_summaries):
            comparison_prompt += f"Paper {i+1}: {paper['title']}\n"
            comparison_prompt += f"Authors: {paper['authors']}\n"
            comparison_prompt += f"Summary: {paper['summary']}\n"
            
            if 'key_contributions' in paper:
                comparison_prompt += "Key Contributions:\n"
                for contrib in paper['key_contributions']:
                    comparison_prompt += f"- {contrib}\n"
            
            if 'strengths' in paper:
                comparison_prompt += "Strengths:\n"
                for strength in paper['strengths']:
                    comparison_prompt += f"- {strength}\n"
            
            if 'weaknesses' in paper:
                comparison_prompt += "Weaknesses:\n"
                for weakness in paper['weaknesses']:
                    comparison_prompt += f"- {weakness}\n"
            
            comparison_prompt += "\n"
        
        comparison_prompt += f"""
        Provide a comparative analysis of these papers in relation to the query. Include:
        1. A brief comparison of their approaches
        2. Their relative strengths and weaknesses
        3. A synthesis of their contributions
        
        Format your response as a JSON object with the following structure:
        {{
          "comparisons": [
            {{
              "paper_title": "Title of Paper 1",
              "approach": "Brief description of approach",
              "strengths": ["strength1", "strength2", ...],
              "weaknesses": ["weakness1", "weakness2", ...]
            }},
            ...
          ],
          "synthesis": "Overall synthesis of the papers' contributions and how they relate to the query"
        }}
        """
        
        # Make a single API call for the comparison
        client = OpenAI(
            base_url="https://api.gptsapi.net/v1",
            api_key=openai_api_key
        )
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a research assistant that compares academic papers in computer science and AI."},
                {"role": "user", "content": comparison_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        comparative_analysis = json.loads(response.choices[0].message.content)
        
        # Format the response for display
        formatted_response = f"# Comparative Analysis of Selected Papers\n\n"
        
        if "comparisons" in comparative_analysis:
            for paper in comparative_analysis["comparisons"]:
                formatted_response += f"## {paper['paper_title']}\n\n"
                formatted_response += f"**Approach:** {paper['approach']}\n\n"
                
                if "strengths" in paper and paper["strengths"]:
                    formatted_response += "**Strengths:**\n"
                    for strength in paper["strengths"]:
                        formatted_response += f"- {strength}\n"
                    formatted_response += "\n"
                
                if "weaknesses" in paper and paper["weaknesses"]:
                    formatted_response += "**Weaknesses:**\n"
                    for weakness in paper["weaknesses"]:
                        formatted_response += f"- {weakness}\n"
                    formatted_response += "\n"
        
        # Add synthesis
        if "synthesis" in comparative_analysis:
            formatted_response += f"## Synthesis\n\n{comparative_analysis['synthesis']}\n\n"
        
        return jsonify({"response": formatted_response, "history": history + [
            {"role": "user", "content": query},
            {"role": "assistant", "content": formatted_response}
        ]})
    
    except Exception as e:
        print(f"Error comparing papers: {str(e)}")
        return jsonify({"error": f"Failed to compare papers: {str(e)}"}), 500


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    if not data or 'query' not in data:
        return jsonify({"error": "Query is required"}), 400
    
    query = data['query']
    history = data.get('history', []) 
    model_name = data.get('model', 'gpt-4o-mini')
    user_understanding = data.get('user_understanding', {})
    
    # Construct a context based on user understanding
    understanding_context = ""
    if user_understanding:
        understanding_context = "User's background knowledge:\n"
        for term, level in user_understanding.items():
            understanding_context += f"- {term}: {level}\n"
        understanding_context += "\nPlease adjust your explanations accordingly. For terms marked 'No Idea' or 'Heard of It', provide basic explanations. For terms marked 'Somewhat Understand', you can use more technical language but still explain key concepts. For 'Fully Understand', you can use advanced terminology."
    
    # Check if this is a request for a literature survey with selected papers
    is_literature_survey_request = (
            'survey' in query.lower()
            and 'selected_papers' in data
            and data['selected_papers']
            and isinstance(data['selected_papers'], list)
    )
    
    # Check if this is a request for comparative analysis with selected papers
    is_comparative_analysis_request = (
            'compare' in query.lower()
            and 'selected_papers' in data
            and data['selected_papers']
            and isinstance(data['selected_papers'], list)
            and len(data['selected_papers']) >= 2  # Need at least 2 papers to compare
    )
    
    # Extract paper information if selected papers exist
    papers_info = []
    if 'selected_papers' in data and data['selected_papers'] and isinstance(data['selected_papers'], list):
        for paper in data['selected_papers']:
            paper_info = {
                'title': paper.get('name', ''),
                'authors': paper.get('author', ''),
                'summary': paper.get('summary', ''),
                'url': paper.get('url', ''),
                'date': paper.get('date', 'N/A'),
                'citation': paper.get('citation', 'N/A'),
                'analysis': paper.get('analysis', {})
            }
            papers_info.append(paper_info)
    
    # Handle literature survey request
    if is_literature_survey_request:
        # Generate a literature survey based on the selected papers
        survey = generate_literature_survey(papers_info, model_name, history)
        return jsonify({"response": survey, "history": history + [
            {"role": "user", "content": query},
            {"role": "assistant", "content": survey}
        ]})
    
    # Handle comparative analysis request
    if is_comparative_analysis_request:
        # Generate a comparative analysis based on the selected papers
        comparative_analysis = generate_comparative_analysis(papers_info, model_name, query=query)
        
        # Format the comparative analysis for display
        formatted_response = "Here's a comparative analysis of the selected papers:\n\n"
        
        # Add overall comparison
        if "overall_comparison" in comparative_analysis:
            formatted_response += f"## Overall Comparison\n\n{comparative_analysis['overall_comparison']}\n\n"
        
        # Add strengths and weaknesses
        if "strengths_weaknesses" in comparative_analysis:
            formatted_response += "## Strengths and Weaknesses\n\n"
            for paper in comparative_analysis["strengths_weaknesses"]:
                formatted_response += f"### {paper['paper_title']}\n\n"
                
                if "strengths" in paper and paper["strengths"]:
                    formatted_response += "**Strengths:**\n"
                    for strength in paper["strengths"]:
                        formatted_response += f"- {strength}\n"
                    formatted_response += "\n"
                
                if "weaknesses" in paper and paper["weaknesses"]:
                    formatted_response += "**Weaknesses:**\n"
                    for weakness in paper["weaknesses"]:
                        formatted_response += f"- {weakness}\n"
                    formatted_response += "\n"
        
        # Add synthesis
        if "synthesis" in comparative_analysis:
            formatted_response += f"## Synthesis\n\n{comparative_analysis['synthesis']}\n\n"
        
        return jsonify({"response": formatted_response, "history": history + [
            {"role": "user", "content": query},
            {"role": "assistant", "content": formatted_response}
        ]})
    
    # Regular chat functionality with selected papers context
    if papers_info:
        # Create a context message that includes information about the selected papers
        papers_context = "Here is information about the selected papers that may be relevant to your query:\n\n"
        for i, paper in enumerate(papers_info):
            papers_context += f"Paper {i+1}: {paper['title']}\n"
            papers_context += f"Authors: {paper['authors']}\n"
            papers_context += f"Publication Date: {paper['date']}\n"
            papers_context += f"Citation Count: {paper['citation']}\n"
            papers_context += f"Summary: {paper['summary']}\n\n"
        
        # Add the papers context to the query
        enhanced_query = f"{understanding_context}\n\n{papers_context}\n\n{query}"
        
        # Check if PDF text content is available
        if 'pdf_text_content' in data and data['pdf_text_content']:
            pdf_context = f"\n\nHere is the content of the currently open PDF document that may be relevant to your query:\n\n{data['pdf_text_content']}\n\n"
            enhanced_query += pdf_context
        
        # Use the enhanced query for the chat
        result = chat_with_agent(enhanced_query, history, model_name)
    else:
        # Regular chat without papers context, but with PDF content if available
        enhanced_query = f"{understanding_context}\n\n{query}"
        
        # Check if PDF text content is available
        if 'pdf_text_content' in data and data['pdf_text_content']:
            pdf_context = f"\n\nHere is the content of the currently open PDF document that may be relevant to your query:\n\n{data['pdf_text_content']}\n\n"
            enhanced_query += pdf_context
        
        # Use the enhanced query for the chat
        result = chat_with_agent(enhanced_query, history, model_name)

    if "error" in result:
        return jsonify(result), 500
    
    return jsonify(result)


@app.route('/extract-pdf-text', methods=['POST'])
def extract_pdf_text():
    data = request.json
    
    if not data or 'pdf_url' not in data:
        return jsonify({"error": "PDF URL is required"}), 400
    
    pdf_url = data['pdf_url']
    
    try:
        # Download the PDF from the URL
        print(pdf_url)
        response = requests.get(pdf_url)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Create a BytesIO object from the response content
        pdf_file = BytesIO(response.content)
        
        # Create a PDF reader object
        pdf_reader = PdfReader(pdf_file)
        
        # Extract text from all pages
        text_content = ""
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text_content += page.extract_text() + "\n\n"
        
        # Return the extracted text
        return jsonify({"text_content": text_content})
    
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to download PDF: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to extract text from PDF: {str(e)}"}), 500


# Add route handler for expanding keywords
@app.route('/expand-keywords', methods=['POST'])
def expand_keywords():
    query = request.json.get('query')
    if not query:
        return jsonify({"error": "Query is required"}), 400
    
    try:
        client = OpenAI(
            base_url="https://api.gptsapi.net/v1",
            api_key=openai_api_key
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Identify 3-5 related keywords or phrases that could enhance the search results for the given query. Return only the JSON array of additional keywords."},
                {"role": "user", "content": query}
            ],
            response_format={"type": "json_object"}
        )
        
        try:
            keywords = json.loads(response.choices[0].message.content)
            return jsonify(keywords)
        except json.JSONDecodeError:
            # Fallback to handle non-JSON responses
            return jsonify({"keywords": []})
    
    except Exception as e:
        print(f"Error expanding keywords: {str(e)}")
        return jsonify({"keywords": []})


# Update the generate-questions endpoint
@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    query = request.json.get('query')
    if not query:
        return jsonify({"error": "Query is required"}), 400
    
    try:
        client = OpenAI(
            base_url="https://api.gptsapi.net/v1",
            api_key=openai_api_key
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Given the user's search query, generate 2-3 questions to assess their understanding of key concepts related to the query. Each question should directly ask about their familiarity with a concept. Return the response as a JSON array of objects with 'question' property."},
                {"role": "user", "content": query}
            ],
            response_format={"type": "json_object"}
        )
        
        try:
            data = json.loads(response.choices[0].message.content)
            return jsonify(data)
        except json.JSONDecodeError:
            # Fallback to handle non-JSON responses
            return jsonify({"questions": []})
    
    except Exception as e:
        print(f"Error generating understanding questions: {str(e)}")
        return jsonify({"questions": []})


# Add a route for updating user understanding (optional, for syncing)
@app.route('/update-understanding', methods=['POST'])
def update_understanding():
    understanding = request.json.get('understanding')
    if not understanding:
        return jsonify({"error": "Understanding data is required"}), 400
    
    # In a real implementation, you might store this in a database
    # For now, we'll just acknowledge receipt
    return jsonify({"success": True})


@app.route('/generate-knowledge-insights', methods=['POST'])
def generate_knowledge_insights():
    try:
        user_profile = request.json.get('userProfile', {})
        
        if not user_profile:
            return jsonify({"error": "User profile data is required"}), 400
        
        # Format the user profile data for the AI prompt
        understanding_data = []
        for concept, level in user_profile.get('understanding', {}).items():
            understanding_data.append(f"- {concept}: {level}")
        
        knowledge_areas_data = []
        for topic, data in user_profile.get('knowledgeAreas', {}).items():
            understanding_level = data.get('understanding', 0)
            count = data.get('count', 0)
            knowledge_areas_data.append(f"- {topic}: Understanding level {understanding_level}/10, Interaction count: {count}")
        
        # Create the prompt for the AI
        prompt = f"""
        You are an AI education advisor analyzing a user's knowledge profile in AI and machine learning.
        
        User's self-reported ability level: {user_profile.get('abilityLevel', 5)}/10
        
        User's understanding of concepts:
        {"No data available" if not understanding_data else "\n".join(understanding_data)}
        
        User's knowledge areas and interaction counts:
        {"No data available" if not knowledge_areas_data else "\n".join(knowledge_areas_data)}
        
        Based on this information, provide:
        1. 2-4 specific strengths the user has demonstrated
        2. 2-4 specific areas where the user could improve or focus their learning
        3. A personalized learning path with 5 specific steps tailored to their current knowledge level
        
        Format your response as a JSON object with the following structure:
        {{
          "strengths": ["strength1", "strength2", ...],
          "weaknesses": ["weakness1", "weakness2", ...],
          "learningPath": {{
            "title": "Personalized title based on their level and interests",
            "steps": ["step1", "step2", "step3", "step4", "step5"]
          }}
        }}
        """
        
        # Call the OpenAI API
        client = OpenAI(
            base_url="https://api.gptsapi.net/v1",
            api_key=openai_api_key
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an AI education advisor specializing in machine learning and AI education."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        # Parse the response
        try:
            insights = json.loads(response.choices[0].message.content)
            return jsonify(insights)
        except json.JSONDecodeError:
            # Fallback for non-JSON responses
            return jsonify({
                "strengths": ["Continue interacting with papers to reveal your strengths."],
                "weaknesses": ["More interactions needed to identify areas for improvement."],
                "learningPath": {
                    "title": "Personalized Learning Path",
                    "steps": ["Continue interacting with papers to receive a customized learning path."]
                }
            })
    
    except Exception as e:
        print(f"Error generating knowledge insights: {str(e)}")
        return jsonify({
            "strengths": ["Continue interacting with papers to reveal your strengths."],
            "weaknesses": ["More interactions needed to identify areas for improvement."],
            "learningPath": {
                "title": "Personalized Learning Path",
                "steps": ["Continue interacting with papers to receive a customized learning path."]
            }
        })


@app.route('/get-citation-count', methods=['POST'])
def get_citation_count():
    paper_id = request.json.get('paper_id')
    if not paper_id:
        return jsonify({"error": "Paper ID is required"}), 400
    
    try:
        # Extract arXiv ID from the URL if it's an arXiv paper
        arxiv_id = None
        if 'arxiv.org' in paper_id:
            # Extract the ID from URLs like https://arxiv.org/abs/2106.09685
            parts = paper_id.split('/')
            arxiv_id = parts[-1]
            if 'v' in arxiv_id:  # Remove version suffix (e.g., v1, v2)
                arxiv_id = arxiv_id.split('v')[0]
        
        # If we have an arXiv ID, query Semantic Scholar API
        if arxiv_id:
            # URL encode the arXiv ID
            encoded_id = quote(f"arXiv:{arxiv_id}")
            url = f"https://api.semanticscholar.org/graph/v1/paper/{encoded_id}?fields=citationCount"
            
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                citation_count = data.get('citationCount', 0)
                
                # Cache the result to avoid repeated API calls
                cache_key = f"citation_{arxiv_id}"
                paper_analysis_cache[cache_key] = citation_count
                
                return jsonify({"citation_count": citation_count})
            else:
                # If API call fails, check cache
                cache_key = f"citation_{arxiv_id}"
                cached_count = paper_analysis_cache.get(cache_key)
                if cached_count is not None:
                    return jsonify({"citation_count": cached_count})
        
        # If we couldn't get a citation count, return 0
        return jsonify({"citation_count": 0})
    
    except Exception as e:
        print(f"Error getting citation count: {str(e)}")
        return jsonify({"error": f"Failed to get citation count: {str(e)}"}), 500


@app.route('/get-paper-metadata', methods=['POST'])
def get_paper_metadata():
    paper_id = request.json.get('paper_id')
    if not paper_id:
        return jsonify({"error": "Paper ID is required"}), 400
    
    try:
        # Extract arXiv ID from the URL if it's an arXiv paper
        arxiv_id = None
        if 'arxiv.org' in paper_id:
            # Extract the ID from URLs like https://arxiv.org/abs/2106.09685
            parts = paper_id.split('/')
            arxiv_id = parts[-1]
            if 'v' in arxiv_id:  # Remove version suffix (e.g., v1, v2)
                arxiv_id = arxiv_id.split('v')[0]
        
        if not arxiv_id:
            return jsonify({"error": "Could not extract arXiv ID"}), 400
        
        # Use the arxiv library to get paper metadata
        search = arxiv.Search(id_list=[arxiv_id])
        paper = next(search.results())
        
        # Format the publication date
        pub_date = paper.published.strftime('%Y.%m.%d')
        
        # Cache the result
        cache_key = f"metadata_{arxiv_id}"
        paper_analysis_cache[cache_key] = {
            "publication_date": pub_date,
            "updated_date": paper.updated.strftime('%Y.%m.%d') if paper.updated else None
        }
        
        return jsonify({
            "publication_date": pub_date,
            "updated_date": paper.updated.strftime('%Y.%m.%d') if paper.updated else None
        })
    
    except StopIteration:
        # Paper not found
        return jsonify({"error": "Paper not found"}), 404
    except Exception as e:
        print(f"Error getting paper metadata: {str(e)}")
        
        # Check cache
        if arxiv_id:
            cache_key = f"metadata_{arxiv_id}"
            cached_data = paper_analysis_cache.get(cache_key)
            if cached_data:
                return jsonify(cached_data)
        
        return jsonify({"error": f"Failed to get paper metadata: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True)
