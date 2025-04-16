// import { buttonVariants } from "@/components/ui/button";
import PaperListView from "./components/paperListView";
import DialogView from "./components/dialogView";
import PaperPreview from "./components/paperPreview"
import HomeListView from "./components/HomeListView";
import { useState, useEffect } from "react";
import Logo from "/logo.svg"
import LibaButton from "/to-your-liba.svg"
import BackChatButton from "/back-to-chat.svg"
import { AnimatePresence, motion } from "framer-motion";
import { FiHome } from "react-icons/fi";
import { FiBook } from "react-icons/fi";
import { FaPaperPlane } from "react-icons/fa";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { ButtonBlue } from "@/components/ui/buttonBlue"
import { searchAPI, analyzePapersBatchAPI, chatAPI, analyzePaperAPI, comparePapersAPI, extractPdfTextAPI, generateQuestionsAPI, expandKeywordsAPI, updateUnderstandingAPI } from "./components/backendHandler";
import { FiPaperclip, FiImage, FiMinimize2 } from "react-icons/fi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import UnderstandingQuestions from "./components/UnderstandingQuestions";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import KnowledgeStats from "./components/KnowledgeStats";

function App() {
  const model = "GPT-4"
  
  // Replace the static title with a state variable
  const [title, setTitle] = useState("Papers related to CNN")

  const initialItems = [
    {
      id: 1,
      name: "Lorem ipsum dolorsi A",
      author: "James A Mike, Rachael B Dan",
      date: "2023.05.15",
      citation: 245,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_150kB.pdf"
    },
    {
      id: 2,
      name: "Lorem ipsum dolorsi B",
      author: "James A Mike, Rachael B Dan",
      date: "2022.08.22",
      citation: 87,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_0.5MB.pdf"
    },
    {
      id: 3,
      name: "Lorem ipsum dolorsi A",
      author: "James A Mike, Rachael B Dan",
      date: "2024.01.10",
      citation: 312,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_1MB.pdf"
    },
    {
      id: 4,
      name: "Lorem ipsum dolorsi B",
      author: "James A Mike, Rachael B Dan",
      date: "2022.11.30",
      citation: 42,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore, Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_5MB.pdf"
    }
  ]

  const initialHomeItems = []

  const initialDialogs = [
    { id: 1, sender: 'user', time: '4:33PM', text: 'Lorem ipsum dolor sit amet consectetur tincidunt bibendum gravida phasellus sed dignissim id tempus ridiculus consectur dolor sit amet'},
    { id: 2, sender: 'ai', time: '4:33PM', text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ea commodo consequat conser dolor amer conserlormer' },
    { id: 3, sender: 'user', time: '4:33PM', text: 'Same here! Trying to debug this React component.' },
    { id: 4, sender: 'ai', time: '4:33PM', text: 'Need any help?' },
  ];

  const [papers, setPapers] = useState(initialItems)
  const [homePapers, setHomePapers] = useState(() => {
    // Try to load homePapers from localStorage
    const savedHomePapers = localStorage.getItem('homePapers');
    return savedHomePapers ? JSON.parse(savedHomePapers) : initialHomeItems;
  });
  const [dialogs, setDialogs] = useState(initialDialogs)
  const [home, setHome] = useState(false);
  const [firstSelectTrigger, setFirstSelectTrigger] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isFirstQuestion, setIsFirstQuestion] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [augmentedSearch, setAugmentedSearch] = useState(true);
  const [expandedKeywords, setExpandedKeywords] = useState([]);
  const [isExpandingKeywords, setIsExpandingKeywords] = useState(false);
  const [originalPapers, setOriginalPapers] = useState([]);
  const [showingSelectedPapers, setShowingSelectedPapers] = useState(false);
  const [shouldUsePaperRef, setShouldUsePaperRef] = useState(false);

  const presetQuestions = [
    "What are the latest papers in CNN architectures?",
    "Give literature survey by comparing different CNN papers.",
    "Explain CNN optimization techniques.",
    "What are trending papers in CNN?",
  ];

  const [userUnderstanding, setUserUnderstanding] = useLocalStorage('userUnderstanding', {});
  const [showUnderstandingQuestions, setShowUnderstandingQuestions] = useState(false);
  const [currentUnderstandingQuestions, setCurrentUnderstandingQuestions] = useState([]);

  const handleHome = (home) => {
    setHome(home);
  };

  useEffect(() => {
    console.log(pdfUrl);
  }, [PaperPreview]); 

  useEffect(() => {
    setIsAnimating(true);
  }, [home]); 

  const handleAnimationComplete = () => {
    setIsAnimating(false);
  };

  const handleAskSelectedPaper = async () => {
    // Save the current papers before replacing them
    setOriginalPapers(papers);
    setShowingSelectedPapers(true);
    
    // Set the paper reference toggle to true
    setShouldUsePaperRef(true);
    
    // Analyze selected papers if they don't have analysis
    const selectedPapers = homePapers.filter(paper => paper.selected === true);
    const unanalyzedPapers = selectedPapers.filter(paper => !paper.analysis);
    
    if (unanalyzedPapers.length > 0) {
      try {
        // Pass the searchQuery to the analyzePapersBatchAPI function
        console.log("Analyzing papers with query in app ask:", searchQuery);
        const analysisResults = await analyzePapersBatchAPI(unanalyzedPapers, searchQuery);
        
        // Update papers with analysis results
        const updatedPapers = homePapers.map(paper => {
          const url = paper.url;
          if (analysisResults[url]) {
            return {
              ...paper,
              analysis: analysisResults[url]
            };
          }
          return paper;
        });
        
        setHomePapers(updatedPapers);
        
        // Update the papers for the dialog view with the analyzed papers
        const analyzedSelectedPapers = updatedPapers.filter(paper => paper.selected === true);
        setPapers(prevPapers => [...analyzedSelectedPapers, ...prevPapers.filter(p => !analyzedSelectedPapers.some(sp => sp.url === p.url))]);
      } catch (error) {
        console.error("Error analyzing papers:", error);
      }
    } else {
      // If all papers are already analyzed, just update the papers for the dialog view
      setPapers(prevPapers => [...selectedPapers, ...prevPapers.filter(p => !selectedPapers.some(sp => sp.url === p.url))]);
    }
    
    setHome(false);
  };

  // Modify the searchToDialog function to only include the user's question
  const searchToDialog = (query) => {
    const moment = new Date();
    const time = moment.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    const newDialog = { id: 1, sender: 'user', time: time, text: query };
    // Don't add the AI response yet
    return [newDialog];
  };

  // Modify the handleSearch function to not show "Searching..." immediately
  const handleSearch = async (query) => {
    if (!query || query.trim() === "") {
      return;
    }

    console.log("Searching for: " + query);
    setIsFirstQuestion(false);
    setSearchQuery(query);
    
    // Update the title with the query, truncating if necessary
    setTitle(query.length > 30 ? query.substring(0, 30) + "..." : query);

    // Update the dialog with just the search query (no AI response yet)
    const SearchDialog = searchToDialog(query);
    setDialogs(SearchDialog);

    // Clear the previous search results temporarily
    setPapers([]);

    // Check if this is a literature survey request
    const isLiteratureSurvey = query.toLowerCase().includes('survey') || 
                              query.toLowerCase().includes('literature') ||
                              query.toLowerCase().includes('review');
    
    // Generate understanding questions after first search
    if (!isLiteratureSurvey) {
      try {
        console.log("Generating understanding questions for query:", query);
        const questions = await generateQuestionsAPI(query);
        console.log("Received questions:", questions);
        
        if (questions && questions.length > 0) {
          setCurrentUnderstandingQuestions(questions);
          setShowUnderstandingQuestions(true);
          return; // Stop here and wait for user to answer questions
        } else {
          console.warn("No questions returned from API");
        }
      } catch (error) {
        console.error("Error generating understanding questions:", error);
      }
    }
    
    // If we get here, either it's a literature survey or there was an error getting questions
    // Proceed directly with search
    proceedWithSearch(query);
  };

  // Update the proceedWithSearch function to add the "Searching..." message
  const proceedWithSearch = async (query) => {
    // Add the "Searching for relevant papers..." message now
    setDialogs(prevDialogs => [
      ...prevDialogs,
      { 
        id: prevDialogs.length + 1, 
        sender: 'ai', 
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }), 
        text: 'Searching for relevant papers...' 
      }
    ]);

    // Expand keywords if augmented search is enabled
    const finalQuery = augmentedSearch ? await expandSearchKeywords(query) : query;

    searchAPI(finalQuery, query).then((data) => {
      console.log("Search results:", data);
      // Change the papers to the search results
      setPapers(data);
      
      // If papers are found, use them to answer the query
      if (data.length > 0) {
        // Send the query and paper summaries to the AI backend
        chatAPI(query, data, null, userUnderstanding).then(response => {
          // Update the dialog with the AI's response (replace the "Searching..." message)
          setDialogs(prevDialogs => [
            prevDialogs[0], // Keep the user's question
            { 
              id: 2, 
              sender: 'ai', 
              time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }), 
              text: response 
            }
          ]);
        }).catch(error => {
          console.error("Error getting AI response:", error);
          // Fallback response if AI fails
          setDialogs(prevDialogs => [
            prevDialogs[0], // Keep the user's question
            { 
              id: 2, 
              sender: 'ai', 
              time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }), 
              text: "I found some relevant papers, but I couldn't generate a response. You can select papers to ask specific questions about them." 
            }
          ]);
        });
      }
    });
  };

  // Function to analyze papers
  const analyzePapers = async (papersToAnalyze, query = null) => {
    try {
      console.log("Analyzing papers with query in app:", query);
      console.log("Query type:", typeof query);
      
      const analysisResults = await analyzePapersBatchAPI(papersToAnalyze, query);
      
      // Update papers with analysis results
      setPapers(prevPapers => 
        prevPapers.map(paper => {
          const url = paper.url;
          if (analysisResults[url]) {
            return {
              ...paper,
              analysis: analysisResults[url]
            };
          }
          return paper;
        })
      );
    } catch (error) {
      console.error("Error analyzing papers:", error);
    }
  };

  // Run the search function on startup with empty results
  useEffect(() => {
    setPapers([]);
  }, []);

  // Function to archive selected papers to the personal library
  const archivePapersToLibrary = (selectedPapers) => {
    if (!selectedPapers || selectedPapers.length === 0) {
      return;
    }
    
    // Create a new array with the selected papers
    const papersToArchive = selectedPapers.map(paper => ({
      ...paper,
      selected: false // Reset the selected state
    }));
    
    // Add the papers to the homePapers array
    setHomePapers(prevHomePapers => {
      // Check for duplicates by URL
      const existingUrls = new Set(prevHomePapers.map(paper => paper.url));
      const newPapers = papersToArchive.filter(paper => !existingUrls.has(paper.url));
      
      const updatedHomePapers = [...prevHomePapers, ...newPapers];
      
      // Save to localStorage
      localStorage.setItem('homePapers', JSON.stringify(updatedHomePapers));
      
      return updatedHomePapers;
    });
    
    // Unselect the papers in the main list
    setPapers(prevPapers => 
      prevPapers.map(paper => 
        selectedPapers.some(sp => sp.id === paper.id) ? { ...paper, selected: false } : paper
      )
    );
  };

  // Add useEffect to save homePapers to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('homePapers', JSON.stringify(homePapers));
  }, [homePapers]);

  // Function to expand search keywords
  const expandSearchKeywords = async (query) => {
    if (!augmentedSearch) return query;
    
    try {
      setIsExpandingKeywords(true);
      
      // Use our backend API instead of direct OpenAI call
      const keywords = await expandKeywordsAPI(query);
      
      setExpandedKeywords(keywords);
      setIsExpandingKeywords(false);
      
      return query + " " + keywords.join(" ");
    } catch (error) {
      console.error("Error expanding search keywords:", error);
      setIsExpandingKeywords(false);
      return query;
    }
  };

  // Update the handleUnderstandingAnswers function
  const handleUnderstandingAnswers = (answers) => {
    console.log("Received understanding answers:", answers);
    const updatedUnderstanding = { ...userUnderstanding };
    
    currentUnderstandingQuestions.forEach((question, index) => {
      if (answers[index]) {
        updatedUnderstanding[question.question] = answers[index];
      }
    });
    
    // Update local state
    setUserUnderstanding(updatedUnderstanding);
    setShowUnderstandingQuestions(false);
    
    // Optionally sync with backend
    updateUnderstandingAPI(updatedUnderstanding).catch(error => {
      console.error("Error updating understanding on server:", error);
    });

    // Now proceed with the search using the updated understanding
    proceedWithSearch(searchQuery);
  };

  // Add a new function to restore original papers
  const restoreOriginalPapers = () => {
    setPapers(originalPapers);
    setShowingSelectedPapers(false);
    setShouldUsePaperRef(false);
  };

  return (
    <main className="flex flex-col min-h-screen min-w-screen bg-[#F6F8FA] overflow-hidden">
      <div className="flex flex-row items-center justify-between w-full bg-white drop-shadow mb-2 pl-5">
        <div className="flex flex-row font-inter items-center justify-start space-x-2 w-[80%] h-14">
          <img src={Logo} alt="" className="select-none pointer-events-none pt-0.5 size-7" />
          <h1 className="text-xl font-medium font-handStand pt-1">Paper Work</h1>
          <h1 className="text-sm italic pt-0.5">- AI Research Paper Browser</h1>
        </div>
        <div className="flex flex-row space-x-3 mr-4">
          <img src={home ? BackChatButton : LibaButton} alt="" className="pt-0.5 h-9.5"
            style={{ transition: "filter 0.3s ease" }}
            onMouseEnter={(e) => {e.target.style.filter = "drop-shadow(0px 3px 8px rgba(35, 136, 255, 0.2))";}}
            onMouseLeave={(e) => {e.target.style.filter = "none";}}
            onClick={() => {handleHome(!home);}}
          />
          <Avatar className="size-9 mr-4" onClick={() => {handleHome(true);}}>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {isFirstQuestion ? (
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-8">
          <div className="flex flex-col items-center space-y-4 w-[600px]">
            <div className="w-full flex flex-col items-center p-2 pt-3 rounded-xl border bg-white border-color-border-2 drop-shadow-md">
              <textarea 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch(searchQuery);
                  }
                }}
                className="flex-1 px-4 m-2 rounded-lg bg-white text-black placeholder-gray-500 h-32 text-[0.9rem] w-full outline-none border-none focus:ring-0 focus:ring-offset-0 border-0 resize-none"
                placeholder="Ask me anything about research papers..."
              />
              <div className="flex flex-row items-center justify-between w-full p-2 pl-3 pr-1 pb-1">
                <div className="flex flex-row items-center justify-center space-x-3">
                  <FiPaperclip size={18} color="#666F8D"/>
                  <FiImage size={18} color="#666F8D"/>
                </div>
                <div className="flex flex-row space-x-4 pl-4 pr-1 font-inter font-medium text-xs text-darker-blue py-1 items-center justify-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="flex items-center space-x-2 cursor-help ask-papers-button"
                          onClick={() => setAugmentedSearch(!augmentedSearch)}
                        >
                          <Switch
                            checked={augmentedSearch}
                            onCheckedChange={setAugmentedSearch}
                            className="mr-1"
                          />
                          <span className="text-[0.8rem]">Expand Search Field</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Automatically expand your query with related keywords</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <ButtonBlue 
                    text="Search Papers" 
                    onClick={() => handleSearch(searchQuery)}
                    disabled={!searchQuery || searchQuery.trim() === ""}
                    icon={<FaPaperPlane className="mr-1" size={14} color="#FFFFFF"/>}
                  />
                </div>
              </div>
            </div>
            
            {isExpandingKeywords && (
              <div className="flex items-center justify-center w-full mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Expanding search keywords...</span>
                </div>
              </div>
            )}
            
            {expandedKeywords.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 mt-2"
              >
                <span className="text-sm text-gray-600">Added keywords:</span>
                {expandedKeywords.map((keyword, index) => (
                  <span key={index} className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {keyword}
                  </span>
                ))}
              </motion.div>
            )}
          </div>
          
          <div className="flex flex-col items-center space-y-2">
            <h2 className="text-sm text-gray-500 mb-2">Or try these prompts for paper browsing:</h2>
            <div className="flex flex-wrap justify-center gap-2 max-w-[800px] text-darker-blue">
              {presetQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(question);
                    handleSearch(question);
                  }}
                  className="px-4 py-2 text-[0.835rem] bg-white border border-color-border-2 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {home ? (
            <motion.div
              key="home-view"
              className="flex flex-row items-center justify-center w-full h-full space-x-8 px-4 overflow-hidden"
              initial={{ opacity: 1, x: 1000 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <HomeListView 
                items={homePapers} 
                setItems={setHomePapers} 
                handleAskSelectedPaper={handleAskSelectedPaper} 
                pdfUrl={pdfUrl} 
                setPdfUrl={setPdfUrl} 
              />
              
              {/* Conditionally render either PaperPreview or KnowledgeStats */}
              {pdfUrl ? (
                <div className="relative w-full">
                  <PaperPreview pdfUrl={pdfUrl} />
                  <button 
                    onClick={() => setPdfUrl(null)}
                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <FiMinimize2 className="text-gray-600" />
                  </button>
                </div>
              ) : (
                <KnowledgeStats />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="dialog-view"
              className="flex flex-row items-center justify-center w-full h-full space-x-8 px-4 mt-2"
              initial={{ opacity: 1, x: -1000 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              onAnimationComplete={handleAnimationComplete}
            >
              {!isAnimating ? (
                <div className="flex flex-col w-full">
                  <DialogView 
                    title={title} 
                    model={model} 
                    dialogs={dialogs}
                    setDialogs={setDialogs} 
                    handleHome={handleHome}
                    papers={papers} 
                    setPapers={setPapers}
                    firstSelectTrigger={firstSelectTrigger}
                    pdfUrl={pdfUrl}
                    userUnderstanding={userUnderstanding}
                    showUnderstandingQuestions={showUnderstandingQuestions}
                    currentUnderstandingQuestions={currentUnderstandingQuestions}
                    handleUnderstandingAnswers={handleUnderstandingAnswers}
                    expandedKeywords={expandedKeywords}
                    isExpandingKeywords={isExpandingKeywords}
                    searchQuery={searchQuery}
                    shouldUsePaperRef={shouldUsePaperRef}
                  /> 
                </div>
              ) : (
                <div className="flex flex-col bg-gradient-to-b from-[#f7f8fa] via-[#f6f7fa] to-[#eef0fa] rounded-lg border border-color-border-2 h-[90vh] w-full"
                  style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
                />
              )}
              <PaperListView 
                items={papers} 
                setItems={setPapers}
                firstSelectTrigger={firstSelectTrigger}
                setFirstSelectTrigger={setFirstSelectTrigger}
                pdfUrl={pdfUrl}
                setPdfUrl={setPdfUrl}
                archivePapersToLibrary={archivePapersToLibrary}
                initQuery={searchQuery}
              />
            </motion.div>
          )}
        </div>
      )}
    </main>
  );
}

export default App;
