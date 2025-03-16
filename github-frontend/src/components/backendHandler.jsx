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

    // response 是 jsonify 的 dict, 在此处可以直接用 response.data 来访问
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

        if ("date" in paper) {
            paper["date"] = paper["date"];
        } else {
            paper["date"] = "N/A";
        }

        if ("citation" in paper) {
            paper["citation"] = paper["citation"];
        }
        else {
            paper["citation"] = "N/A";
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

export const chatAPI = async (query) => {
    const response = await axios.post(apiUrl + "chat", {
        query: query,
    });

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