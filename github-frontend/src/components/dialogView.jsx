import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { FiSettings, FiTrash, FiDownload, FiMinimize2, FiBookmark, FiClipboard } from "react-icons/fi";
import { IoCopyOutline } from "react-icons/io5";
import { AiOutlineShareAlt } from "react-icons/ai";
import { GoBookmark } from "react-icons/go";
import { ButtonBlue } from "@/components/ui/buttonBlue";
import { Switch } from "@/components/ui/switch";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { GrRotateRight } from "react-icons/gr";
import { FaPaperPlane } from "react-icons/fa";
import { FiBook, FiBox, FiShare2 } from "react-icons/fi";
import { FiPaperclip } from "react-icons/fi";
import { FiImage } from "react-icons/fi";
import { GrMicrophone } from "react-icons/gr";
import AvatarUser from "/user-avatar.svg"
import AvatarAI from "/ai-avatar.svg"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import { motion } from "framer-motion";
import UnderstandingQuestions from './UnderstandingQuestions';
import { FiCornerDownLeft } from "react-icons/fi";
import { FiThumbsUp, FiThumbsDown } from "react-icons/fi";
import { Progress } from "@/components/ui/progress";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FiArrowLeft } from "react-icons/fi";

import { searchAPI, similarAPI, generateSurveyAPI, chatAPI, extractPdfTextAPI } from "./backendHandler";


// Function to check if a URL is a PDF
const isPdfUrl = (url) => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.pdf') || url.includes('arxiv.org/abs/');
};

export default function DialogView({
  title, 
  model, 
  dialogs, 
  setDialogs, 
  handleHome, 
  papers, 
  setPapers, 
  firstSelectTrigger, 
  pdfUrl, 
  userUnderstanding, 
  showUnderstandingQuestions, 
  currentUnderstandingQuestions, 
  handleUnderstandingAnswers,
  expandedKeywords,
  isExpandingKeywords,
  searchQuery,
  shouldUsePaperRef
}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [usePaperRef, setUserPaperRef] = useState(shouldUsePaperRef || false);
  const [useAugSearch, setUserAugSearch] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [pdfTextContent, setPdfTextContent] = useState(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const pdfIframeRef = useRef(null);
  const [showFeedbackUI, setShowFeedbackUI] = useState(false);
  const [currentFeedbackMessage, setCurrentFeedbackMessage] = useState(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [userAbilityLevel, setUserAbilityLevel] = useLocalStorage('userAbilityLevel', 5); // Scale from 1-10
  const [userKnowledgeAreas, setUserKnowledgeAreas] = useLocalStorage('userKnowledgeAreas', {});
  const [showFeedbackFor, setShowFeedbackFor] = useState(null);

  useEffect(() => {
    // Set loading state for questions when showUnderstandingQuestions is true but questions aren't loaded yet
    if (showUnderstandingQuestions && (!currentUnderstandingQuestions || currentUnderstandingQuestions.length === 0)) {
      setIsLoadingQuestions(true);
    } else {
      setIsLoadingQuestions(false);
    }
  }, [showUnderstandingQuestions, currentUnderstandingQuestions]);

  useEffect(() => {
    if (showUnderstandingQuestions) {
      setUserPaperRef(false);
    }
  }, [showUnderstandingQuestions]);

  useEffect(() => {
    const targetDiv = document.getElementById("loadingText");
    if (targetDiv !== null) {
      let dotCount = 0;
      const interval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        targetDiv.innerHTML = `Analysing Articles${".".repeat(dotCount)}`;
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  useEffect(() => {
    if (firstSelectTrigger) {
      setUserPaperRef(true);
    }
  }, [firstSelectTrigger]);

  // Update the useEffect that listens for PDF layout changes
  useEffect(() => {
    const checkLayout = () => {
      // Check if we're in a wide or full layout
      const pdfViewer = document.querySelector('.pdf-viewer');
      if (pdfViewer) {
        // First try to get the layout from the data attribute
        const layout = pdfViewer.getAttribute('data-layout');
        
        // Update dialog container width
        const dialogContainer = document.querySelector('.dialog-messages-container');
        if (dialogContainer) {
          if (layout === 'wide') {
            dialogContainer.classList.remove('max-w-[45rem]', 'max-w-[20rem]', 'max-w-[40rem]');
            dialogContainer.classList.add('max-w-[30rem]');
            setIsWideLayout(true);
          } else if (layout === 'full') {
            dialogContainer.classList.remove('max-w-[45rem]', 'max-w-[30rem]', 'max-w-[40rem]');
            dialogContainer.classList.add('max-w-[20rem]');
            setIsWideLayout(true);
          } else {
            dialogContainer.classList.remove('max-w-[30rem]', 'max-w-[20rem]', 'max-w-[45rem]');
            dialogContainer.classList.add('max-w-[40rem]');
            setIsWideLayout(false);
          }
        }
        
        // Handle Ask button visibility
        const askButton = document.querySelector('.ask-papers-button');
        if (askButton) {
          askButton.style.display = layout === 'full' ? 'none' : 'flex';
        }
      } else {
        // Reset to default layout when PDF viewer is not present
        const dialogContainer = document.querySelector('.dialog-messages-container');
        if (dialogContainer) {
          dialogContainer.classList.remove('max-w-[30rem]', 'max-w-[20rem]', 'max-w-[40rem]');
          dialogContainer.classList.add('max-w-[45rem]');
        }
        setIsWideLayout(false);
        
        // Show the Ask Selected Papers button
        const askButton = document.querySelector('.ask-papers-button');
        if (askButton) {
          askButton.style.display = 'flex';
        }
      }
    };

    // Initial check
    checkLayout();

    // Set up a MutationObserver to watch for changes to the PDF viewer
    const observer = new MutationObserver(checkLayout);
    
    // Observe the entire document for changes to the PDF viewer
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['data-layout']
    });
    
    // Also check on window resize
    window.addEventListener('resize', checkLayout);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkLayout);
    };
  }, []);

  // Function to get the hint text based on the layout width
  const getHintText = (type) => {
    if (isWideLayout) {
      switch (type) {
        case "ask":
          return "Refer";
        case "pro":
          return "Pro";
        case "send":
          return "Send";
        default:
          return "";
      }
    } else {
      switch (type) {
        case "ask":
          return "Ask Selected Papers";
        case "pro":
          return "Pro Search";
        case "send":
          return "Send message";
        default:
          return "";
      }
    }
  };

  // Add this function to properly fetch PDF content
  const fetchPdfContent = async () => {
    console.log("Fetching PDF content for URL:", pdfUrl);
    if (pdfUrl && isPdfUrl(pdfUrl)) {
      try {
        setIsExtractingText(true);
        console.log("Extracting text from PDF...");
        const text = await extractPdfTextAPI(pdfUrl);
        console.log("PDF text extracted:", text ? text.substring(0, 100) + "..." : "No text extracted");
        setPdfTextContent(text);
      } catch (error) {
        console.error("Error extracting PDF text:", error);
      } finally {
        setIsExtractingText(false);
      }
    } else {
      console.log("No valid PDF URL to extract from");
      setPdfTextContent(null);
    }
  };

  // Make sure PDF content is fetched when pdfUrl changes
  useEffect(() => {
    console.log("PDF URL changed:", pdfUrl);
    fetchPdfContent();
  }, [pdfUrl]);

  // Debug the PDF content when it changes
  useEffect(() => {
    console.log("PDF content updated:", pdfTextContent ? `${pdfTextContent.length} characters` : "null");
  }, [pdfTextContent]);

  // Add this function to handle getting AI responses
  const getAIResponse = async (userMessage, selectedPapers, pdfContent, understanding) => {
    console.log("Getting AI response with:", {
      message: userMessage,
      papers: selectedPapers ? selectedPapers.length : 0,
      hasPdfContent: !!pdfContent,
      understanding: Object.keys(understanding || {}).length
    });
    
    // Include selected papers and user understanding in the API call
    const response = await chatAPI(
      userMessage, 
      selectedPapers,
      pdfContent,
      understanding
    );
    
    console.log("AI response received");
    return response;
  };

  // Modify the handleSendMessage function to properly include PDF content
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput("");
    setIsLoading(true);
    
    // Add user message to dialog
    const userMessageObj = {
      id: Date.now(),
      sender: "user",
      text: userMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setDialogs(prevDialogs => [...prevDialogs, userMessageObj]);
    
    try {
      // Get selected papers
      const selectedPapers = usePaperRef ? papers.filter(paper => paper.selected) : null;
      
      console.log("Selected papers:", selectedPapers);
      console.log("PDF content length:", pdfTextContent ? pdfTextContent.length : 0);
      console.log("PDF content sample:", pdfTextContent ? pdfTextContent.substring(0, 100) + "..." : "No content");
      
      // Get AI response
      const aiResponse = await getAIResponse(
        userMessage, 
        selectedPapers,
        pdfTextContent, // Pass the PDF content directly
        userUnderstanding
      );
      
      // Add AI response to dialog
      const aiMessageObj = {
        id: Date.now(),
        sender: "ai",
        text: aiResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setDialogs(prevDialogs => [...prevDialogs, aiMessageObj]);
      
      // Set current feedback message for potential understanding feedback
      setCurrentFeedbackMessage(aiMessageObj);
      
      // Show feedback UI if there are terms in the user understanding
      if (Object.keys(userUnderstanding).length > 0) {
        setShowFeedbackUI(true);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      // Add error message to dialog
      const errorMessageObj = {
        id: Date.now(),
        sender: "system",
        text: "Sorry, there was an error processing your request. Please try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setDialogs(prevDialogs => [...prevDialogs, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate the typing effect for AI response
  const typeAIResponse = (aiResponse) => {
    let index = 0;
    const typingSpeed = 50;
    const intervalId = setInterval(() => {
      setCurrentText((prevText) => prevText + aiResponse[index]);
      index += 1;
      if (index === aiResponse.length) {
        clearInterval(intervalId);
      }
    }, typingSpeed);
  };

  // Add this function to handle understanding feedback
  const handleUnderstandingFeedback = (understood) => {
    if (!currentFeedbackMessage) return;
    
    // Extract terms from the AI message
    const termsInMessage = extractTermsFromMessage(currentFeedbackMessage.text);
    
    // Update user understanding based on feedback
    const updatedUnderstanding = { ...userUnderstanding };
    
    termsInMessage.forEach(term => {
      // If user already has an understanding level for this term
      if (term in updatedUnderstanding) {
        const currentLevel = updatedUnderstanding[term];
        
        // Adjust understanding level based on feedback
        if (understood) {
          // Move understanding up one level if they understood the explanation
          if (currentLevel === "No Idea") {
            updatedUnderstanding[term] = "Heard of It";
          } else if (currentLevel === "Heard of It") {
            updatedUnderstanding[term] = "Somewhat Understand";
          } else if (currentLevel === "Somewhat Understand") {
            updatedUnderstanding[term] = "Fully Understand";
          }
        } else {
          // If they didn't understand, don't change the level
          // But we could potentially set a flag to provide more basic explanations
        }
      }
    });
    
    // Update the understanding state
    setUserUnderstanding(updatedUnderstanding);
    setShowFeedbackUI(false);
  };

  // Function to extract technical terms from a message
  const extractTermsFromMessage = (message) => {
    // For a real implementation, you might want to use NLP or the AI to extract terms
    // This is a simplified version that looks for terms in the user understanding object
    const terms = Object.keys(userUnderstanding);
    return terms.filter(term => message.toLowerCase().includes(term.toLowerCase()));
  };

  // Function to render knowledge status indicators
  const renderKnowledgeStatus = () => {
    if (!userUnderstanding || Object.keys(userUnderstanding).length === 0) {
      return null;
    }

    // Get the understanding levels
    const levels = Object.values(userUnderstanding);
    
    // Count occurrences of each level
    const levelCounts = {
      "No Idea": 0,
      "Heard of It": 0,
      "Somewhat Understand": 0,
      "Fully Understand": 0
    };
    
    levels.forEach(level => {
      if (levelCounts[level] !== undefined) {
        levelCounts[level]++;
      }
    });

    // Create color mapping for levels
    const levelColors = {
      "No Idea": "bg-red-100 text-red-800 border-red-300",
      "Heard of It": "bg-yellow-100 text-yellow-800 border-yellow-300",
      "Somewhat Understand": "bg-blue-100 text-blue-800 border-blue-300",
      "Fully Understand": "bg-green-100 text-green-800 border-green-300"
    };

    return (
      <div className="flex items-center space-x-2 text-xs">
        <FiBox className="text-gray-500" />
        <span className="text-gray-600">Knowledge Profile:</span>
        <div className="flex space-x-1">
          {Object.entries(levelCounts).map(([level, count]) => {
            if (count > 0) {
              return (
                <TooltipProvider key={level}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`px-2 py-0.5 rounded-full border ${levelColors[level]} text-xs`}>
                        {count}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{count} concept(s) you {level.toLowerCase()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  // Add this function to handle feedback
  const handleFeedback = (messageId, understood) => {
    // Update the ability level
    setUserAbilityLevel(prevLevel => {
      const newLevel = understood 
        ? Math.min(10, prevLevel + 1) 
        : Math.max(1, prevLevel - 1);
      return newLevel;
    });
    
    // Extract topics from the message
    const message = dialogs.find(d => d.id === messageId);
    if (message && message.text) {
      // Simple topic extraction (in a real app, use NLP or AI)
      const potentialTopics = extractTopics(message.text);
      
      // Update knowledge areas
      setUserKnowledgeAreas(prev => {
        const updated = {...prev};
        potentialTopics.forEach(topic => {
          if (!updated[topic]) {
            updated[topic] = { count: 0, understanding: 5 };
          }
          updated[topic].count += 1;
          updated[topic].understanding = understood 
            ? Math.min(10, updated[topic].understanding + 1)
            : Math.max(1, updated[topic].understanding - 1);
        });
        return updated;
      });
      
      // Mark this message as having received feedback
      setDialogs(prevDialogs => 
        prevDialogs.map(dialog => 
          dialog.id === messageId 
            ? { ...dialog, feedbackSubmitted: true } 
            : dialog
        )
      );
    }
    
    // Hide the feedback UI
    setShowFeedbackFor(null);
  };

  // Simple topic extraction function
  const extractTopics = (text) => {
    // This is a simplified approach - in a real app, use NLP or AI
    const commonTopics = [
      "machine learning", "neural networks", "deep learning", 
      "computer vision", "natural language processing", "reinforcement learning",
      "CNN", "RNN", "transformer", "attention mechanism", "BERT", "GPT"
    ];
    
    return commonTopics.filter(topic => 
      text.toLowerCase().includes(topic.toLowerCase())
    );
  };

  const isPlaceholderMessage = (message) => {
    return message.isPlaceholder || 
           message.text.includes('Searching for relevant papers') ||
           message.text.length < 30 ||
           message.text.match(/\.{3,}$/);
  };

  // Add this to the message rendering logic
  const renderFeedbackUI = (message) => {
    if (message.sender !== 'ai') return null;
    
    // Check if feedback has already been submitted for this message
    const feedbackSubmitted = message.feedbackSubmitted;
    
    if (feedbackSubmitted) {
      return (
        <div className="flex items-center justify-end mt-1 bg-gray-50 py-1.5 px-3 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-sm font-inter font-normal text-gray-500 flex items-center p-1 italic">
            Your Knowledge State has been updated!
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-end mt-1 bg-gray-50 py-1.5 px-3 rounded-lg border border-gray-200 shadow-sm">
        <span className="text-sm font-inter font-normal text-gray-500 mr-2 pl-1">Did you understand this response?</span>
        <div className="flex items-center">
          <button 
            onClick={() => handleFeedback(message.id, true)}
            className="p-2 rounded-full hover:bg-green-100 transition-colors"
          >
            <FiThumbsUp className="text-green-600" />
          </button>
          <button 
            onClick={() => handleFeedback(message.id, false)}
            className="p-2 rounded-full hover:bg-red-100 transition-colors"
          >
            <FiThumbsDown className="text-red-600" />
          </button>
        </div>
      </div>
    );
  };

  // Add an effect to update usePaperRef when shouldUsePaperRef changes
  useEffect(() => {
    if (shouldUsePaperRef !== undefined) {
      setUserPaperRef(shouldUsePaperRef);
    }
  }, [shouldUsePaperRef]);

  // Check if send button should be disabled
  const isSendDisabled = () => {
    // Disable if message is empty or loading
    if (!input.trim() || isLoading) return true;
    
    // Disable if understanding questions are showing and not yet answered
    if (showUnderstandingQuestions) return true;
    
    return false;
  };

  // Render tooltip content for disabled send button
  const getSendButtonTooltip = () => {
    if (!input.trim()) return "Please enter a message";
    if (isLoading) return "Processing your request...";
    if (showUnderstandingQuestions) return "Please complete or skip the personalization questions first";
    return "Send message";
  };

  return (
    <div className="flex flex-col bg-gradient-to-b from-[#f7f8fa] via-[#f6f7fa] to-[#eef0fa] rounded-lg border border-color-border-2 h-[90vh] flex-grow"
      style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
    >
      <div className="flex flex-row justify-between items-center px-4 py-2 border-b border-color-border-2">
        <div className="flex flex-row items-center space-x-2">
          <FiBook className="text-gray-500" />
          <h2 className="text-sm font-medium text-gray-700">{title}</h2>
          <span className="text-xs text-gray-500">{model}</span>
        </div>
        <div className="flex flex-row items-center space-x-2">
          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <FiClipboard className="text-gray-500" size={16} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <FiShare2 className="text-gray-500" size={16} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <FiBookmark className="text-gray-500" size={16} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <FiSettings className="text-gray-500" size={16} />
          </button>
        </div>
      </div>
      
      {/* Augmented search keywords and knowledge status */}
      {(expandedKeywords.length > 0 || Object.keys(userUnderstanding).length > 0) && (
        <div className="px-4 py-2 border-b border-color-border-2 bg-gray-50">
          {expandedKeywords.length > 0 && (
            <div className="flex items-center mb-2 overflow-hidden">
              <span className="text-xs text-gray-600 mr-2 whitespace-nowrap">Fields:</span>
              <div className={`flex flex-row overflow-hidden relative max-w-[40rem] group dialog-messages-container`}>
                {/* Left gradient overlay - initially hidden */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-l from-transparent to-gray-50 z-10 opacity-0 transition-opacity duration-300"
                  ref={(el) => {
                    if (!el) return;
                    
                    // Find the scrollable container
                    const container = el.parentElement.querySelector('.overflow-x-auto');
                    if (!container) return;
                    
                    // Update gradient visibility on initial load
                    if (container.scrollLeft > 5) {
                      el.style.opacity = '1';
                    } else {
                      el.style.opacity = '0';
                    }
                    
                    // Add scroll event listener to show/hide left gradient
                    const handleScroll = () => {
                      if (container.scrollLeft > 5) {
                        el.style.opacity = '1';
                      } else {
                        el.style.opacity = '0';
                      }
                    };
                    
                    // Add the event listener
                    container.addEventListener('scroll', handleScroll);
                    
                    // Store the listener for cleanup
                    el._scrollListener = handleScroll;
                    
                    // Cleanup function for when component unmounts
                    return () => {
                      if (container && el._scrollListener) {
                        container.removeEventListener('scroll', el._scrollListener);
                      }
                    };
                  }}
                ></div>
                
                <div 
                  className="flex overflow-x-auto no-scrollbar"
                  onWheel={(e) => {
                    // Prevent the default vertical scroll
                    e.preventDefault();
                    
                    // Get the container
                    const container = e.currentTarget;
                    
                    // Scroll horizontally instead of vertically
                    // Use deltaY for the horizontal scroll amount
                    container.scrollLeft += e.deltaY;
                  }}
                >
                  <div className="flex space-x-1 py-0.5 pl-0.5">
                    {expandedKeywords.map((keyword, index) => (
                      <span 
                        key={index} 
                        className="keyword-tag text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Right gradient overlay */}
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-gray-50 z-10"></div>
              </div>
            </div>
          )}
          
          {isExpandingKeywords && (
            <div className="flex items-center mb-2">
              <div className="animate-pulse flex space-x-2 items-center">
                <span className="text-xs text-gray-600">Expanding search keywords...</span>
              </div>
            </div>
          )}
          
          {Object.keys(userUnderstanding).length > 0 && renderKnowledgeStatus()}
        </div>
      )}
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {dialogs.map((dialog, index) => (
          <React.Fragment key={index}>
            <div className={`flex ${dialog.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-lg ${
                dialog.sender === 'user' 
                  ? 'bg-blue-100 text-blue-900 border border-blue-200 drop-shadow-sm' 
                  : dialog.sender === 'system'
                    ? 'bg-gray-100 text-gray-700 italic text-sm drop-shadow-sm border border-gray-200'
                    : 'bg-white border border-gray-200 drop-shadow-sm text-gray-800'
              }`}>
                {dialog.sender === 'ai' ? (
                  <div className="text-sm prose prose-sm max-w-none text-[0.9rem] w-full font-inter font-normal text-color-text-grey">
                    <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-1 leading-relaxed" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-4" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2 mt-3" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-3 flex flex-col space-y-2 min-w-0" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-3 flex flex-col space-y-2" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1 leading-relaxed break-words inline-flex items-start"><span className="mr-2">•</span><span className="flex-1">{props.children}</span></li>,
                          code: ({node, inline, ...props}) => 
                            inline ? 
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props} /> : 
                              <code className="block bg-gray-100 p-3 rounded text-sm mb-3 font-mono overflow-x-auto" {...props} />,
                          pre: ({node, ...props}) => <pre className="bg-gray-100 p-3 rounded mb-3 overflow-x-auto" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-3 py-1" {...props} />,
                          a: ({node, ...props}) => <a className="text-blue-500 hover:underline" {...props} />,
                          table: ({node, ...props}) => <table className="border-collapse border border-gray-300 mb-3 w-full" {...props} />,
                          th: ({node, ...props}) => <th className="border border-gray-300 px-3 py-2 bg-gray-100" {...props} />,
                          td: ({node, ...props}) => <td className="border border-gray-300 px-3 py-2" {...props} />,
                          hr: ({node, ...props}) => <hr className="my-4 border-t border-gray-300" {...props} />,
                        }}
                      >
                      {dialog.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm">{dialog.text}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {dialog.time}
                </div>
              </div>
            </div>
            {/* Render feedback UI below AI messages */}
            {dialog.sender === 'ai' && !isPlaceholderMessage(dialog) && (
              <div className="flex justify-start mb-2">
                {renderFeedbackUI(dialog)}
              </div>
            )}
          </React.Fragment>
        ))}
        
        {/* Show understanding questions after the user's first message */}
        {showUnderstandingQuestions && dialogs.length === 1 && dialogs[0].sender === 'user' && (
          <div className="flex justify-start w-full">
            <div className="max-w-[80%]">
              {isLoadingQuestions ? (
                <div className="flex flex-col space-y-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ) : (
                <UnderstandingQuestions 
                  questions={currentUnderstandingQuestions}
                  onAnswer={handleUnderstandingAnswers}
                  savedAnswers={currentUnderstandingQuestions.map(q => userUnderstanding[q.question])}
                  inline={true}
                />
              )}
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg bg-white border border-gray-200 drop-shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-color-border-2">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-4 mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <Switch
                      checked={usePaperRef}
                      onCheckedChange={setUserPaperRef}
                      className="mr-1"
                      disabled={showUnderstandingQuestions}
                    />
                    <span className="text-xs">Paper Reference</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Include selected papers in your query</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer">
                      <Switch
                        checked={useAugSearch}
                        onCheckedChange={setUserAugSearch}
                        className="mr-1"
                      />
                      <span className="text-xs">Expanded Search</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Automatically expand your query with related keywords</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Simple animated circle loading indicator */}
              {isExtractingText && (
                <div className="flex items-center ml-4">
                  <div className="loading-spinner"></div>
                  <span className="text-xs text-gray-600 ml-2">RAG Extracting...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex shadow-inner items-center space-x-2 border border-gray-300 rounded-lg px-3 pl-5 py-2 bg-white">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && e.ctrlKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-white text-black placeholder-gray-500 text-sm outline-none border-none focus:ring-0 focus:ring-offset-0 resize-none h-10 max-h-32 min-h-10 py-2.5"
              placeholder="Ask a follow-up question..."
            />
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 pr-3">
                <FiPaperclip className="text-gray-400 cursor-pointer" />
                <FiImage className="text-gray-400 cursor-pointer" />
                <GrMicrophone className="text-gray-400 cursor-pointer" />
              </div>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div>
                      <ButtonBlue
                        text={
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold">Send</span>
                            <span className="ml-1 text-xs opacity-80 flex items-center">
                              Ctrl+<FiCornerDownLeft size={12} className="ml-0.5" />
                            </span>
                          </div>
                        }
                        icon={<FaPaperPlane size={14} className="text-white mr-1" />}
                        onClick={handleSendMessage}
                        disabled={isSendDisabled()}
                        className={`h-8 p-0 flex items-center justify-center w-fit ${
                          isSendDisabled() ? "opacity-50 filter grayscale" : ""
                        }`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-800 text-white p-2 text-xs rounded">
                    {getSendButtonTooltip()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
