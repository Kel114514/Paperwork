import arxiv
from pinecone import Pinecone, ServerlessSpec
import time

API_KEY = r'pcsk_76Mmum_UpWTHBNSbtTD3SB33eDmZHHJRTKAMMhiJRMJ6QJv8CEfoCiuzr2FLogfTskwPuS'
EMB_MODEL = 'multilingual-e5-large'

pc=Pinecone(api_key = API_KEY)
index=pc.Index('index')

def search_arxiv(query: str, max_results: int = 5) -> list[dict]:
    '''
    Search the papers on Arxiv
    Return the list selected papers, including title, summary, url, authors, and time
    '''
    search = arxiv.Search(
        query = query,
        max_results = max_results,
        sort_by = arxiv.SortCriterion.Relevance,
        sort_order = arxiv.SortOrder.Descending
    )
    return [{
        'title': result.title,
        'summary': result.summary,
        'url': result.entry_id,
        'authors': ', '.join([author.name for author in result.authors]),
        'time': result.published.ctime()
    } for result in search.results()]


def upsert_data(papers: list[dict]):
    '''
    Upsert the papers to the database
    '''
    embeddings = pc.inference.embed(
        model = EMB_MODEL,
        inputs = [p["summart"] for p in papers],
        parameters = {
            "input_type": "passage", 
            "truncate": "END"
        }
    )

    print('Token usage: ', embeddings.usage['total_tokens'], sep = '')

    records = []
    for p, e in zip(papers, embeddings):
        records.append({
            "id": p["url"],
            "values": e["values"],
            "metadata": {
                k: v for k, v in p.items() if not k == 'url'
            }
        })

    index.upsert(vectors=records)

    time.sleep(1)


def search_database(query: str, max_results = 5) -> list[dict]:
    '''
    Search for papaers in the database
    '''
    query_embedding = pc.inference.embed(
        model = EMB_MODEL,
        inputs = [query],
        parameters = {
            "input_type": "query"
        }
    )

    results = index.query(
        vector = query_embedding[0].values,
        top_k = max_results,
        include_values = False,
        include_metadata = True
    )

    papers = []
    for result in results['matches']:
        papers.append(result['metadata'])
        papers[-1]['url'] = result['id']

    return papers


def genenate_literature_review(papers: list) -> str:
    pass