import { useState, useEffect } from "react";

// Handle the backend API calls via axios
import axios from "axios";

// 后端可用API: search, similar, generate-survey; Method 是 POST
const apiUrl = "http://localhost:5000/";

// Search API: params: {query: "query"}
export const searchAPI = async (query) => {
    const response = await axios.post(apiUrl + "search", {
        query: query,
    });
    // response 是 jsonify 的 dict, 在此处可以直接用 response.data 来访问
    return response.data;
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
    return response;
}
