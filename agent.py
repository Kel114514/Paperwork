import os
import time
from dotenv import load_dotenv
import arxiv
from database import search_arxiv, upsert_data, search_database
from openai import AzureOpenAI


def adapt_search_arxiv_paper(paper: dict) -> dict:
    new_paper = paper.copy()
    if "summary" in new_paper and "summart" not in new_paper:
        new_paper["summart"] = new_paper["summary"]
    return new_paper


def get_abstract(paper: dict) -> str:
    if "summary" in paper:
        return paper["summary"]
    elif "summart" in paper:
        return paper["summart"]
    return ""


def generate_literature_review_agent(query: str, search_mode: str = "both", model: str = "gpt-4o-mini",
                                     history: list = []):
    """
    Parameters:
      query: The user search keyword.
      search_mode: The search mode; options are:
                   "local" (search only the existing database),
                   "new" (search for the latest preprints and upsert them into the database),
                   or "both" (search both arXiv and the existing database, then merge deduplicated results).
      model: The model name to use, default is "gpt-4o-mini".
      history: Optional chat history to enhance context.
    Returns:
      A string representing the literature review generated by calling the Azure OpenAI API.
    """
    load_dotenv()

    collected_papers = []

    if search_mode == "new":
        print("Searching for the latest articles via arXiv...")
        new_papers_raw = search_arxiv(query, max_results=5)
        new_papers = [adapt_search_arxiv_paper(p) for p in new_papers_raw]
        if new_papers:
            print(f"Found {len(new_papers)} new articles, upserting into the database...")
            upsert_data(new_papers)
            collected_papers.extend(new_papers)
        else:
            print("No new articles found.")

    elif search_mode in ["both", "local"]:
        print("Searching for relevant articles in the local database...")
        local_papers = search_database(query, max_results=5)
        collected_papers.extend(local_papers)
        if search_mode == "both" and not collected_papers:
            print("No relevant articles found in the local database, searching via arXiv...")
            new_papers_raw = search_arxiv(query, max_results=5)
            new_papers = [adapt_search_arxiv_paper(p) for p in new_papers_raw]
            if new_papers:
                print(f"Found {len(new_papers)} new articles, upserting into the database...")
                upsert_data(new_papers)
                collected_papers.extend(new_papers)
            else:
                print("No new articles found.")

    unique_papers = {}
    for paper in collected_papers:
        unique_papers[paper["url"]] = paper
    collected_papers = list(unique_papers.values())

    if not collected_papers:
        return "No relevant articles found, please try other search keywords."

    print("Found papers:")
    for idx, paper in enumerate(collected_papers, start=1):
        title = paper.get("title", "Untitled")
        url = paper.get("url", "N/A")
        print(f"{idx}. Title: {title}, URL: {url}")

    prompt_lines = []
    prompt_lines.append(
        "Please write a detailed literature review based on the following articles' titles and abstracts. Requirements:")
    prompt_lines.append("1. Extract the main contributions and limitations of each article;")
    prompt_lines.append("2. Compare the similarities and differences among the articles;")
    prompt_lines.append("3. Summarize potential future research directions.")
    prompt_lines.append("Article List:")

    for i, paper in enumerate(collected_papers, start=1):
        title = paper.get("title", "Untitled")
        abstract = get_abstract(paper)
        prompt_lines.append(f"{i}. Title: {title}")
        prompt_lines.append(f"   Abstract: {abstract}")

    prompt_lines.append("Based on the above information, please generate a high-quality literature review.")
    prompt = "\n".join(prompt_lines)

    messages = [{"role": "user", "content": prompt}]
    if history:
        messages.extend(history)

    client = AzureOpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        api_version="2024-10-01-preview",
        azure_endpoint="https://hkust.azure-api.net/"
    )

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=512,
        temperature=0.0
    )

    return response.choices[0].message.content


if __name__ == "__main__":
    query = input("Please enter a search query: ")
    review = generate_literature_review_agent(query, search_mode="both")
    print("\nGenerated literature review:\n")
    print(review)
