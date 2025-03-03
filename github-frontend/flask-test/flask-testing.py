# This is a testing demo for the backend of Papersearch using Flask.
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)


@app.route('/search', methods=['POST'])
def search():
    # log the request when doing app run
    query = request.json.get('query')
    print(f'Searching for papers with query: {query}')

    # return a dummy response
    data = [
        {
            'title': 'Paper 1',
            'summary': 'This is a summary of paper 1',
            'url': 'http://example.com/paper1',
            'authors': ['Author 1', 'Author 2'],
        },
        {
            'title': 'Paper 2',
            'summary': 'This is a summary of paper 2',
            'url': 'http://example.com/paper2',
            'authors': ['Author 3', 'Author 4'],
        },
    ]
    return jsonify(data)

@app.route('/similar', methods=['POST'])
def similar():
    data = [
        {
            'title': 'Paper 3',
            'summary': 'This is a summary of paper 3',
            'url': 'http://example.com/paper3',
            'authors': ['Author 5', 'Author 6'],
        },
        {
            'title': 'Paper 4',
            'summary': 'This is a summary of paper 4',
            'url': 'http://example.com/paper4',
            'authors': ['Author 7', 'Author 8'],
        },
    ]
    return jsonify(data)

@app.route('/generate-survey', methods=['POST'])
def generate_survey():
    return jsonify({'survey': 'survey response'})

if __name__ == '__main__':
    app.run(debug=True)