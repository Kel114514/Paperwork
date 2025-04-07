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


# Function to search for articles using the arxiv API
def search_articles(query, max_results=10):
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.Relevance
    )
    return [{
        'title': result.title,
        'summary': result.summary,
        'url': result.entry_id,
        'authors': [author.name for author in result.authors]
    } for result in search.results()]


# Function to add articles to FAISS index
def add_article_to_db(article):
    text = article['summary']
    embedding = model.encode([text])[0]
    articles_db[article['url']] = article
    index.add(np.array([embedding], dtype=np.float32))


# Route for searching articles, using POST instead of GET for the query
# @app.route('/search', methods=['GET'])
@app.route('/search', methods=['POST'])
def search():
    print(request.json)
    
    # query = request.args.get('query')
    query = request.json.get('query')

    # for testing
    print(query)

    if not query:
        return jsonify({"error": "Query is required"}), 400
    
    articles = search_articles(query)

    # Add articles to the DB and index if they are not already present
    for article in articles:
        if article['url'] not in articles_db:
            add_article_to_db(article)
    
    return jsonify(articles)


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


def analyze_papers_batch(articles, model_name='gpt-4o-mini', query=None):
    """
    Analyze multiple papers in batch for relevance, technical innovation, and feasibility.
    Uses a comparative approach to create more differentiation between papers.
    
    Parameters:
        articles: List of articles to analyze
        model_name: The model to use for analysis
        query: Optional query to evaluate relevance against
    
    Returns:
        A dictionary with article URLs as keys and analysis results as values
    """
    results = {}
    
    # First pass: analyze each paper individually
    for article in articles:
        url = article.get('url', '')
        if url:
            # Pass all articles for comparative analysis
            results[url] = analyze_paper(article, model_name, articles, query=query)
    
    return results


@app.route('/analyze-papers-batch', methods=['POST'])
def analyze_papers_batch_endpoint():
    """
    Endpoint to analyze multiple papers in batch.
    """
    data = request.json
    if not data or 'articles' not in data:
        return jsonify({"error": "Articles data is required"}), 400
    
    articles = data['articles']
    model_name = data.get('model', 'gpt-4o-mini')
    
    # Get the query parameter if provided, defaulting to None if not present
    query = data.get('query')
    print("Batch query from request:", query)
    print("Batch query type:", type(query))
    
    # If query is an empty string, set it to None
    if query == "":
        query = None
        print("Empty query string detected, setting to None")
    
    results = analyze_papers_batch(articles, model_name, query=query)
    
    # Check if any errors occurred
    errors = {url: result for url, result in results.items() if "error" in result}
    if errors:
        return jsonify({"errors": errors, "results": results}), 500
    
    return jsonify(results)


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
    analyses = analyze_papers_batch(articles, model_name, query=query)
    
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
def compare_papers_endpoint():
    """
    Endpoint to generate a comparative analysis of multiple papers.
    """
    data = request.json
    if not data or 'articles' not in data:
        return jsonify({"error": "Articles data is required"}), 400
    
    articles = data['articles']
    model_name = data.get('model', 'gpt-4o-mini')
    query = data.get('query', None)  # Get the query parameter if provided
    
    comparative_analysis = generate_comparative_analysis(articles, model_name, query=query)
    
    if "error" in comparative_analysis:
        return jsonify(comparative_analysis), 500
    
    return jsonify(comparative_analysis)


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    # print(data)
    if not data or 'query' not in data:
        return jsonify({"error": "Query is required"}), 400
    
    query = data['query']
    history = data.get('history', []) 
    model_name = data.get('model', 'gpt-4o-mini') 
    
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
        enhanced_query = f"{query}\n\n{papers_context}"
        
        # Check if PDF text content is available
        if 'pdf_text_content' in data and data['pdf_text_content']:
            pdf_context = f"\n\nHere is the content of the currently open PDF document that may be relevant to your query:\n\n{data['pdf_text_content']}\n\n"
            enhanced_query += pdf_context
        
        # Use the enhanced query for the chat
        result = chat_with_agent(enhanced_query, history, model_name)
    else:
        # Regular chat without papers context, but with PDF content if available
        enhanced_query = query
        
        # Check if PDF text content is available
        if 'pdf_text_content' in data and data['pdf_text_content']:
            pdf_context = f"\n\nHere is the content of the currently open PDF document that may be relevant to your query:\n\n{data['pdf_text_content']}\n\n"
            enhanced_query += pdf_context
        
        # Use the enhanced query for the chat
        result = chat_with_agent(enhanced_query, history, model_name)

    # print(enhanced_query)
    
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


if __name__ == '__main__':
    app.run(debug=True)
