import arxiv
from pinecone import Pinecone, ServerlessSpec
import time
import datetime

API_KEY = r'pcsk_76Mmum_UpWTHBNSbtTD3SB33eDmZHHJRTKAMMhiJRMJ6QJv8CEfoCiuzr2FLogfTskwPuS'
EMB_MODEL = 'multilingual-e5-large'
RERANK_MODEL = "bge-reranker-v2-m3"

pc = Pinecone(api_key=API_KEY)
index = pc.Index('index')


class Paper:
    def __init__(self, url: str, title: str, summary: str, authors: list[str], date: datetime.date) -> None:
        self.id = url.split('/')[-1]
        self.url = url
        self.title = title
        self.summary = summary
        self.authors = authors
        self.date = date
        self.citations = -1

    @staticmethod
    def from_arxiv_result(result) -> 'Paper':
        return Paper(
            url=result.entry_id,
            title=result.title,
            summary=result.summary,
            authors=[author.name for author in result.authors],
            date=result.updated.date()
        )

    @staticmethod
    def from_metadata(metadata: dict) -> 'Paper':
        paper = Paper(**metadata)
        paper.authors = metadata['authors'].split(', ')
        paper.date = datetime.date(
            *([int(i) for i in metadata['date'].split('-')]))
        return paper

    def __eq__(self, right: object) -> bool:
        if isinstance(right, Paper):
            return self.id == right.id
        elif isinstance(right, str):
            return self.id == right
        else:
            raise ValueError('Cannot compare Paper with other data type.')

    def to_metadata(self) -> dict:
        metadata = {k: str(v)
                    for k, v in self.__dict__.items() if not k in ('id', 'authors', 'citations')}
        metadata['authors'] = ', '.join(self.authors)
        return metadata


def search_arxiv(query: str, max_results: int = 5) -> list[Paper]:
    '''
    Search the papers on Arxiv
    Return the list selected papers
    '''
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.Relevance,
        sort_order=arxiv.SortOrder.Descending
    )
    return [Paper.from_arxiv_result(result=result) for result in search.results()]


def upsert_data(papers: list[Paper]):
    '''
    Upsert the papers to the database
    '''
    embeddings = pc.inference.embed(
        model=EMB_MODEL,
        inputs=[p.summary for p in papers],
        parameters={
            "input_type": "passage",
            "truncate": "END"
        }
    )

    print('Token usage for embedding: ',
          embeddings.usage['total_tokens'], sep='')

    records = []
    for p, e in zip(papers, embeddings):
        records.append({
            "id": p.id,
            "values": e["values"],
            "metadata": p.to_metadata()
        })

    index.upsert(vectors=records)

    # Wait for the server
    time.sleep(1)


def search_database(query: str, max_results=5) -> list[Paper]:
    '''
    Search for papaers in the database
    '''
    query_embedding = pc.inference.embed(
        model=EMB_MODEL,
        inputs=[query],
        parameters={
            "input_type": "query"
        }
    )

    results = index.query(
        vector=query_embedding[0].values,
        top_k=max_results,
        include_values=False,
        include_metadata=True
    )

    papers = []
    for result in results['matches']:
        papers.append(Paper.from_metadata(result['metadata']))

    return papers


def rerank_papers(query: str, papers: list[Paper], max_results=None) -> list[Paper]:
    if max_results is None:
        max_results = len(papers)
    documents = [{'text': p.summary} for p in papers]
    result = pc.inference.rerank(
        model=RERANK_MODEL,
        query=query,
        documents=documents,
        top_n=max_results,
        return_documents=False,
        parameters={"truncate": "END"}
    )

    reranked_index = [i['index'] for i in result.data]
    print('Token usage for embedding: ', result.usage, sep='')
    return [papers[i] for i in reranked_index]

