import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { FiSettings, FiTrash, FiDownload, FiMinimize2 } from "react-icons/fi";
import { IoCopyOutline } from "react-icons/io5";
import { AiOutlineShareAlt } from "react-icons/ai";
import { GoBookmark } from "react-icons/go";
import { ButtonBlue } from "@/components/ui/buttonBlue";
import { Switch } from "@/components/ui/switch";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { GrRotateRight } from "react-icons/gr";
import { FaPaperPlane } from "react-icons/fa";
import { FiBook } from "react-icons/fi";
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

import { searchAPI, similarAPI, generateSurveyAPI, chatAPI, extractPdfTextAPI } from "./backendHandler";

// Function to check if a URL is a PDF
const isPdfUrl = (url) => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.pdf') || url.includes('arxiv.org/abs/');
};

export default function DialogView({title, model, dialogs, setDialogs, handleHome, papers, setPapers, firstSelectTrigger, pdfUrl}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [usePaperRef, setUserPaperRef] = useState(false);
  const [useAugSearch, setUserAugSearch] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [pdfTextContent, setPdfTextContent] = useState(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const pdfIframeRef = useRef(null);

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

  // Listen for changes in the PDF layout
  useEffect(() => {
    const checkLayout = () => {
      // Check if we're in a wide or full layout
      const pdfViewer = document.querySelector('.pdf-viewer');
      if (pdfViewer) {
        // First try to get the layout from the data attribute
        const layout = pdfViewer.getAttribute('data-layout');
        if (layout === 'wide') {
          setIsWideLayout(true);
          // Show the Ask Selected Papers button in wide view
          const askButton = document.querySelector('.ask-papers-button');
          if (askButton) {
            askButton.style.display = 'flex';
          }
        } else if (layout === 'full') {
          setIsWideLayout(true);
          // Hide the Ask Selected Papers button in full view
          const askButton = document.querySelector('.ask-papers-button');
          if (askButton) {
            askButton.style.display = 'none';
          }
        } else {
          setIsWideLayout(false);
          // Show the Ask Selected Papers button in compact view
          const askButton = document.querySelector('.ask-papers-button');
          if (askButton) {
            askButton.style.display = 'flex';
          }
        }
      } else {
        // Reset to compact layout when PDF viewer is not present
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
    
    // Start observing the document body for changes
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-layout']
    });

    // Add event listener for window resize
    window.addEventListener('resize', checkLayout);

    // Cleanup
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

  // Function to extract text from the PDF using backend API
  const extractTextFromPdf = async () => {
    if (!pdfUrl || !isPdfUrl(pdfUrl)) return null;
    
    setIsExtractingText(true);
    
    try {
      const textContent = await extractPdfTextAPI(pdfUrl);
      setPdfTextContent(textContent);
      return textContent;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      return null;
    } finally {
      setIsExtractingText(false);
    }
  };

  // Extract text from PDF when pdfUrl changes
  useEffect(() => {
    if (pdfUrl) {
      extractTextFromPdf();
    } else {
      setPdfTextContent(null);
    }
  }, [pdfUrl]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (input.trim() === "") return;

    // Get selected papers
    const selectedPapers = filterSelectedPapers();
    const hasSelectedPapers = usePaperRef && selectedPapers.length > 0;
    
    // Add user message to dialog
    setDialogs([...dialogs, { 
      text: input, 
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    
    // If using paper reference, add a system message about included papers
    if (hasSelectedPapers) {
      // Add a system message about included papers
      setDialogs(prevDialogs => [...prevDialogs, { 
        text: `Including ${selectedPapers.length} selected paper${selectedPapers.length > 1 ? 's' : ''} with summaries and analysis in this query.`, 
        sender: "system",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
    
    // If PDF is open, add a system message about using PDF content
    if (pdfUrl && pdfTextContent) {
      setDialogs(prevDialogs => [...prevDialogs, { 
        text: `Using the content from the currently viewed PDF as reference for this query.`, 
        sender: "system",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
    
    setInput("");
    setIsLoading(true);
    setCurrentText("");

    try {
      const aiResponse = await fetchAIResponse(input);
      setDialogs((prevDialogs) => [
        ...prevDialogs,
        { 
          text: aiResponse, 
          sender: "ai",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
      typeAIResponse(aiResponse);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setDialogs((prevDialogs) => [
        ...prevDialogs,
        { 
          text: "Fetching AI response failed.", 
          sender: "ai",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSelectedPapers = () => {
    return papers.filter(paper => paper.selected === true);
  }

  // Placeholder for AI response (simulated for now)
  const fetchAIResponse = async (userMessage) => {
    console.log("Fetching AI response for:", userMessage);
    
    // Get selected papers
    const selectedPapers = filterSelectedPapers();
    
    // Log the selected papers and their analysis data
    console.log("Selected papers:", selectedPapers);
    selectedPapers.forEach(paper => {
      console.log(`Paper ${paper.name}:`, {
        summary: paper.summary,
        analysis: paper.analysis
      });
    });
    
    // Include selected papers in the API call if the usePaperRef switch is enabled
    // Also include PDF text content if available
    const response = await chatAPI(
      userMessage, 
      usePaperRef ? selectedPapers : null,
      pdfUrl ? pdfTextContent : null
    );
    
    console.log("AI response:", response);
    return response;
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

  return (
    <div className="flex flex-col bg-gradient-to-b from-[#f7f8fa] via-[#f6f7fa] to-[#eef0fa] rounded-lg border border-color-border-2 h-[90vh] w-full"
      style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
    >
      <div className="relative flex-1 rounded-lg">
        <div className="flex flex-row items-center justify-center bg-white p-2 py-4 space-x-3 rounded-t-lg border-b border-color-border-2">
            <h1 className="font-inter font-medium text-base">{title}</h1>
            <div className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1">{model}</div>
        </div>
        <div className="p-2 rounded-lg py-4 overflow-y-auto h-[62vh]" style={{overflow: "overlay"}}>
            {/* Display all messages */}
            {dialogs.map((dialog, index) => (
                dialog.sender === "user" ? (
                    <div key={index} className="flex flex-row items-start justify-start w-full space-x-3 px-6">
                      <Avatar className="select-none pointer-events-none size-8">
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex flex-row items-center justify-start space-x-4">
                          <h1 className="text-[0.9rem] font-inter font-medium">{"Researcher"}</h1>
                          <h1 className="text-sm pt-0.5 font-inter font-medium text-color-text-grey">{dialog.time}</h1>
                        </div>
                        <div className="w-full text-[0.9rem] font-inter font-normal text-color-text-grey pt-2">{dialog.text}</div>
                      </div>
                    </div>
                ) : dialog.sender === "system" ? (
                    <div key={index} className="flex flex-row items-center justify-center w-full my-2">
                      <div className={`${dialog.text.includes('•') ? 'bg-gray-100 text-gray-700 text-xs px-3 py-2 rounded-md whitespace-pre-line text-left' : 'bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full'}`}>
                        {dialog.text}
                      </div>
                    </div>
                ) : (
                  <div key={index} className="flex flex-col space-y-2 px-2 py-4 mx-6 my-4 bg-white drop-shadow-sm border border-color-border-2 rounded-xl">
                    <div className="flex flex-row items-start justify-start w-full space-x-3 px-3 py-1">
                      <img src={AvatarAI} alt="" className="select-none pointer-events-none pt-1 size-8" />
                      <div className="flex flex-col">
                        <div className="flex flex-row items-center justify-start space-x-4">
                          <h1 className="text-[0.9rem] font-inter font-medium">{"Paper Master"}</h1>
                          <h1 className="text-sm pt-0.5 font-inter font-medium text-color-text-grey">{dialog.time}</h1>
                        </div>
                        <div className="text-[0.9rem] w-full font-inter font-normal text-color-text-grey pt-2">
                          <ReactMarkdown
                            components={{
                              p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
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
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between h-7">
                      <div className="absolute left-2 bottom-3 flex flex-row space-x-4 pl-[3.2rem] pt-2 pb-2">
                        <GrRotateRight size={17} color="#666F8D"/>
                        <IoCopyOutline size={17} color="#666F8D"/>
                        <AiOutlineShareAlt size={17} color="#666F8D"/>
                        <GoBookmark size={17} color="#666F8D"/>
                        <HiOutlineDotsVertical size={17} color="#666F8D"/>
                      </div>
                      <div className="absolute right-2 bottom-4 font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 mr-2 bg-color-bg-1">50 tokens</div>
                    </div>
                  </div>
                )
            ))}
            {isLoading && (
              <div className="flex flex-col space-y-2 px-2 py-4 m-6 bg-white drop-shadow-sm border border-color-border-2 rounded-xl">
                <div className="flex flex-row items-start justify-start w-full space-x-3 px-3 py-1">
                  <img src={AvatarAI} alt="" className="select-none pointer-events-none size-8" />
                  <div className="flex flex-col">
                    <div id="loadingText" className="text-[0.9rem] w-full font-inter font-normal text-color-text-grey pt-1.5">{"Analysing Articles."}</div>
                  </div>
                </div>
              </div>
            )}
        </div>


      {/* Input area */}
      <div className="absolute left-0 right-0 m-auto bottom-4 w-[96.5%] flex flex-col items-center p-2 pt-3 rounded-xl border bg-white border-color-border-2 h-40 drop-shadow-md">
        <textarea 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="flex-1 px-4 m-2 rounded-lg bg-white text-black placeholder-gray-500 h-full text-[0.9rem] w-full outline-none border-none focus:ring-0 focus:ring-offset-0 border-0"
          placeholder={pdfUrl ? "Ask questions about the currently viewed PDF" : "How can I help you with the selected papers?"}
        />
        <div className="flex flex-row items-center justify-between w-full p-2 pr-1 pb-1">
          <div className="flex flex-row space-x-4">
            <div className="cursor-pointer flex flex-row font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 space-x-1 items-center justify-center hover:drop-shadow-sm"
              onClick={() => {handleHome(true);}}
            >
              <FiBook size={16} color="#19213D"/>
              <h1>Library</h1>
            </div>
            <div className="flex flex-row items-center justify-center space-x-3">
              <FiPaperclip size={18} color="#666F8D"/>
              <FiImage size={18} color="#666F8D"/>
              <GrMicrophone size={18} color="#666F8D"/>
            </div>
            {pdfUrl && (
              <div className={`flex flex-row items-center space-x-1 ${isWideLayout ? '' : '-translate-x-2'} ${document.querySelector('.pdf-viewer')?.getAttribute('data-layout') === 'full' ? 'hidden' : ''}`}>
                {isExtractingText ? (
                  <div className="text-xs text-gray-500 flex items-center whitespace-nowrap">
                    <div className="animate-spin mr-1 h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    RAG Prep
                  </div>
                ) : pdfTextContent ? (
                  <div className="text-xs text-green-600 flex items-center whitespace-nowrap">
                    <svg className="mr-1 h-3 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    RAG Done
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 flex items-center whitespace-nowrap">
                    <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    RAG Fail 
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-row space-x-3 pl-4 pr-1 font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 bg-color-bg-1 items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex items-center space-x-2 cursor-help ask-papers-button">
                    <Switch 
                      checked={usePaperRef} 
                      onCheckedChange={setUserPaperRef}
                    />
                    <span className="text-xs">{getHintText("ask")}</span>
                  </label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Include selected papers with summaries and analysis in your query for context-aware responses</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <label className="items-center space-x-2 hidden xl:flex">
              <Switch 
                checked={useAugSearch} 
                onCheckedChange={setUserAugSearch} 
              />
              <span className="text-xs">{getHintText("pro")}</span>
            </label>
            <ButtonBlue onClick={handleSendMessage} disabled={isLoading} text={getHintText("send")} icon={<FaPaperPlane className="mr-1" size={14} color="#FFFFFF"/>}/>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
