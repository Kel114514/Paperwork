import os

from openai import OpenAI
import arxiv
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import dotenv


app = Flask(__name__)

# Initialize SentenceTransformer model for embeddings
model = SentenceTransformer('paraphrase-MiniLM-L6-v2')
dotenv.load_dotenv(dotenv_path=".env")

# Initialize FAISS index for storing vectors
dim = 768  # Vector dimension size from SentenceTransformer
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


# Route for searching articles
@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query')
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
    article_summaries = "\n".join([article['summary'] for article in selected_articles])
    prompt = f"Write a literature survey based on the following articles:\n{article_summaries}\n\nSummary:"

    client = OpenAI(
        base_url="https://api.gptsapi.net/v1",
        api_key=os.getenv("OPENAI_API_KEY")
    )
    response = client.chat.completions.create(
        model=model_name,
        messages=[{
            "role": "user",
            "content": f"{prompt}"
        }] + history
    )
    return response.choices[0].message.content


# Route for generating literature survey
@app.route('/generate-survey', methods=['POST'])
def generate_survey():
    selected_articles = request.json.get('selected_articles')
    if not selected_articles:
        return jsonify({"error": "Selected articles are required"}), 400

    # Generate the literature survey
    survey = generate_literature_survey(selected_articles)

    return jsonify({"survey": survey})


if __name__ == '__main__':
    app.run(debug=True)
