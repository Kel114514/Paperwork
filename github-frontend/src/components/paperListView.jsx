import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Reorder } from "framer-motion";
import { Item } from "./item";
import { FiSettings } from "react-icons/fi";
import { FiTrash } from "react-icons/fi";
import { FiDownload } from "react-icons/fi";
import { FiMinimize2 } from "react-icons/fi";
import { ButtonBlue } from "@/components/ui/buttonBlue";
import { TooltipIcon } from "./ui/tooltipIcon";
import { FaAngleRight, FaAngleDown } from "react-icons/fa";
import { FiPackage } from "react-icons/fi";
import { FiTarget, FiZap, FiCheckSquare, FiClock, FiTrendingUp, FiSearch } from "react-icons/fi";
import { analyzePapersBatchAPI } from "./backendHandler";
import { IoCopyOutline } from "react-icons/io5";
import { AiOutlineShareAlt } from "react-icons/ai";
import { GoBookmark } from "react-icons/go";
import { Switch } from "@/components/ui/switch";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { GrRotateRight } from "react-icons/gr";
import { FaPaperPlane } from "react-icons/fa";
import { FiBook } from "react-icons/fi";
import { FiPaperclip } from "react-icons/fi";
import { FiImage } from "react-icons/fi";
import { GrMicrophone } from "react-icons/gr";
import { MdOutlineViewCompact, MdOutlineViewAgenda, MdOutlineViewStream } from "react-icons/md";
import { BsLayoutSidebarReverse, BsLayoutSplit, BsLayoutSidebar } from "react-icons/bs";
import { FiArrowLeft } from "react-icons/fi";
import { FaArrowLeft } from "react-icons/fa6";

export default function PaperListView({ 
  items, 
  setItems, 
  firstSelectTrigger, 
  setFirstSelectTrigger,
  pdfUrl, 
  setPdfUrl, 
  archivePapersToLibrary, 
  initQuery,
  showingSelectedPapers,
  restoreOriginalPapers
}) {
  const [isHovered, setIsHovered] = useState(false); // State to track hover
  const [isAskHovered, setIsAskHovered] = useState(false); // State to track hover
  const [isAnalyzing, setIsAnalyzing] = useState(false); // State to track analysis status
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State to track dropdown open/close
  const [pdfLayout, setPdfLayout] = useState("compact"); // State to track PDF layout mode
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false); // State to track archive confirmation
  const [archiveMessage, setArchiveMessage] = useState(""); // State to track archive message
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false); // State to track remove confirmation
  const [removeMessage, setRemoveMessage] = useState(""); // State to track remove message
  const [analysisQuery, setAnalysisQuery] = useState(initQuery); // State to track analysis query
  const [showQueryInput, setShowQueryInput] = useState(false); // State to track query input visibility
  const dropdownRef = useRef(null); // Ref for the dropdown container
  const queryInputRef = useRef(null); // Ref for the query input field

  // Reset PDF layout to compact when returning to paper selection
  useEffect(() => {
    if (pdfUrl === null) {
      setPdfLayout("compact");
    }
  }, [pdfUrl]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelected = (id, isSelected) => {
    setIsHovered(false);
    setIsAskHovered(true);
    if (!firstSelectTrigger) setFirstSelectTrigger(true);
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, selected: isSelected } : item
      )
    );
  };

  const handleIsHovered = (hover, isSelected) => {
    if (isSelected !== null && isSelected) {
        setIsAskHovered(hover);
        setIsHovered(false);
    } else {
        setIsHovered(hover);
        setIsAskHovered(false);
    }
  };

  // Function to analyze papers
  const analyzePapers = async () => {
    if (items.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Pass the analysis query to the API if it's not empty
      const query = analysisQuery.trim() || null;
      console.log("Analyzing papers with query in paper list view:", query);
      
      // Always include the query parameter in the request, even if it's null
      const analysisResults = await analyzePapersBatchAPI(items, query);

      console.log("Analysis results:", analysisResults);
      
      // Update items with analysis results
      setItems(prevItems => 
        prevItems.map(item => {
          const url = item.url;
          if (analysisResults[url]) {
            return {
              ...item,
              analysis: analysisResults[url]
            };
          }
          return item;
        })
      );
      
      // Hide the query input after analysis
      setShowQueryInput(false);
    } catch (error) {
      console.error("Error analyzing papers:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Function to toggle the query input visibility
  const toggleQueryInput = () => {
    setShowQueryInput(!showQueryInput);
    // Focus the input field when it becomes visible
    if (!showQueryInput && queryInputRef.current) {
      setTimeout(() => {
        queryInputRef.current.focus();
      }, 100);
    }
  };

  // Function to handle query input key press
  const handleQueryKeyPress = (e) => {
    if (e.key === 'Enter') {
      analyzePapers();
    } else if (e.key === 'Escape') {
      setShowQueryInput(false);
    }
  };

  // Function to rank papers by a specific criteria
  const rankPapersBy = (criteria) => {
    const sortedItems = [...items];
    
    switch (criteria) {
      case "relevance":
        sortedItems.sort((a, b) => {
          const ratingA = a.analysis?.relevance?.rating || 0;
          const ratingB = b.analysis?.relevance?.rating || 0;
          return ratingB - ratingA; // Descending order
        });
        break;
      case "technical_innovation":
        sortedItems.sort((a, b) => {
          const ratingA = a.analysis?.technical_innovation?.rating || 0;
          const ratingB = b.analysis?.technical_innovation?.rating || 0;
          return ratingB - ratingA; // Descending order
        });
        break;
      case "feasibility":
        sortedItems.sort((a, b) => {
          const ratingA = a.analysis?.feasibility?.rating || 0;
          const ratingB = b.analysis?.feasibility?.rating || 0;
          return ratingB - ratingA; // Descending order
        });
        break;
      case "time":
        sortedItems.sort((a, b) => {
          const dateA = new Date(a.date || "1970-01-01");
          const dateB = new Date(b.date || "1970-01-01");
          return dateB - dateA; // Descending order (newest first)
        });
        break;
      case "citation":
        sortedItems.sort((a, b) => {
          const citationA = parseInt(a.citation) || 0;
          const citationB = parseInt(b.citation) || 0;
          return citationB - citationA; // Descending order
        });
        break;
      default:
        break;
    }
    
    setItems(sortedItems);
    setIsDropdownOpen(false); // Close dropdown after selection
  };

  // Analyze papers when component mounts if they don't have analysis
  useEffect(() => {
    const hasUnanalyzedPapers = items.some(item => !item.analysis);
    if (hasUnanalyzedPapers && items.length > 0) {
      analyzePapers();
    }
  }, [items.length]);

  // Function to get the PDF viewer width class based on the selected layout
  const getPdfViewerWidthClass = () => {
    switch (pdfLayout) {
      case "compact":
        return "w-[44rem]";
      case "wide":
        return "w-[55rem]";
      case "full":
        return "w-[65rem]";
      default:
        return "w-[44rem]";
    }
  };

  // Function to get the hint text based on the selected layout
  const getHintText = (type) => {
    if (pdfLayout === "wide" || pdfLayout === "full") {
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
          return "Ask";
        case "pro":
          return "pro search";
        case "send":
          return "send message";
        default:
          return "";
      }
    }
  };

  // Function to remove selected papers from the list
  const removeSelectedPapers = () => {
    // Get selected papers
    const selectedPapers = items.filter(item => item.selected);
    
    if (selectedPapers.length === 0) {
      // Show a message if no papers are selected
      setRemoveMessage("Please select papers to remove");
      setShowRemoveConfirmation(true);
      
      // Hide the confirmation after 3 seconds
      setTimeout(() => {
        setShowRemoveConfirmation(false);
      }, 3000);
      return;
    }
    
    // Filter out selected papers
    const updatedItems = items.filter(item => !item.selected);
    setItems(updatedItems);
    
    // If all papers are removed, reset the first select trigger
    if (updatedItems.length === 0) {
      setFirstSelectTrigger(false);
    }
    
    // Show a confirmation message
    setRemoveMessage(`${selectedPapers.length} paper(s) removed from the list`);
    setShowRemoveConfirmation(true);
    
    // Hide the confirmation after 3 seconds
    setTimeout(() => {
      setShowRemoveConfirmation(false);
    }, 3000);
  };

  // Function to archive selected papers to library
  const archiveSelectedPapers = () => {
    // Get selected papers
    const selectedPapers = items.filter(item => item.selected);
    
    if (selectedPapers.length === 0) {
      // Show a message if no papers are selected
      setArchiveMessage("Please select papers to archive");
      setShowArchiveConfirmation(true);
      
      // Hide the confirmation after 3 seconds
      setTimeout(() => {
        setShowArchiveConfirmation(false);
      }, 3000);
      return;
    }
    
    // Call the archivePapersToLibrary function from the parent component
    archivePapersToLibrary(selectedPapers);
    
    // Show a confirmation message
    setArchiveMessage(`${selectedPapers.length} paper(s) archived to your library`);
    setShowArchiveConfirmation(true);
    
    // Hide the confirmation after 3 seconds
    setTimeout(() => {
      setShowArchiveConfirmation(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col h-[90vh] space-y-4">
        {pdfUrl === null ? (
          <div
              className="flex flex-col rounded-lg border border-color-border-2 h-full p-2 bg-white"
              style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
          >
              <div className="flex flex-row font-inter font-medium text-darker-blue mb-2 mt-3 pl-3">
                  <h1
                  className={`transition-all duration-300 ${
                      isHovered ? "transform scale-105 text-[#007BFF] pr-0.5" : "" // Apply scaling effect on hover
                  }`}
                  >
                      Select
                  </h1>
                  <h1 className="px-1">and</h1>
                  <h1
                  className={`transition-all duration-300 pr-1 ${
                      isAskHovered ? "transform scale-105 text-[#007BFF] px-0.5" : "" // Apply scaling effect on hover
                  }`}
                  >
                      {getHintText("ask")}
                  </h1>
                  your interest papers
              </div>
              <div className={`flex flex-row items-center justify-start space-x-4 ${!showingSelectedPapers && 'px-3'}`}>
                  <div className="relative" ref={dropdownRef}>
                    {!showingSelectedPapers && (
                      <ButtonBlue 
                        className="font-inter" 
                        text={
                          <span className="font-semibold">Rank Papers By</span>
                        }
                        icon={isDropdownOpen ? 
                          <FaAngleDown size={14} color="#FFFFFF" /> : 
                          <FaAngleRight size={14} color="#FFFFFF" />
                        } 
                        // disabled={isAnalyzing}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      />
                    )}
                    
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-[15rem] overflow-hidden rounded-md border pb-3 pt-2 border-color-border-2 bg-white text-darker-blue shadow-md mt-1">
                        <div 
                          className="relative flex cursor-pointer select-none items-center mx-2 px-2 py-1.5 text-sm outline-none transition-colors hover:bg-color-bg-1 hover:text-darker-blue"
                          onClick={() => rankPapersBy("time")}
                        >
                          <FiClock className="mr-2 font-color-border-2" size={16} />
                          By Time
                        </div>
                        <div 
                          className="relative flex cursor-pointer select-none items-center mx-2 px-2 py-1.5 text-sm outline-none transition-colors hover:bg-color-bg-1 hover:text-darker-blue"
                          onClick={() => rankPapersBy("citation")}
                        >
                          <FiTrendingUp className="mr-2 font-color-border-2" size={16} />
                          By Citation
                        </div>
                        <div className="w-full h-[1px] bg-[#E3E6EA] my-2" />
                        <div 
                          className={`relative flex select-none items-center mx-2 px-2 py-1.5 text-sm outline-none transition-colors ${
                            isAnalyzing 
                              ? "opacity-50 cursor-not-allowed text-gray-400" 
                              : "cursor-pointer hover:bg-color-bg-1 hover:text-darker-blue"
                          }`}
                          onClick={() => !isAnalyzing && rankPapersBy("relevance")}
                        >
                          <FiTarget className={`mr-2 ${isAnalyzing ? "text-gray-400" : "font-color-border-2"}`} size={16} />
                          By Relevance
                        </div>
                        <div 
                          className={`relative flex select-none items-center mx-2 px-2 py-1.5 text-sm outline-none transition-colors ${
                            isAnalyzing 
                              ? "opacity-50 cursor-not-allowed text-gray-400" 
                              : "cursor-pointer hover:bg-color-bg-1 hover:text-darker-blue"
                          }`}
                          onClick={() => !isAnalyzing && rankPapersBy("technical_innovation")}
                        >
                          <FiZap className={`mr-2 ${isAnalyzing ? "text-gray-400" : "font-color-border-2"}`} size={16} />
                          By Technical Innovation
                        </div>
                        <div 
                          className={`relative flex select-none items-center mx-2 px-2 py-1.5 text-sm outline-none transition-colors ${
                            isAnalyzing 
                              ? "opacity-50 cursor-not-allowed text-gray-400" 
                              : "cursor-pointer hover:bg-color-bg-1 hover:text-darker-blue"
                          }`}
                          onClick={() => !isAnalyzing && rankPapersBy("feasibility")}
                        >
                          <FiCheckSquare className={`mr-2 ${isAnalyzing ? "text-gray-400" : "font-color-border-2"}`} size={16} />
                          By Feasibility/Operability
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Add Back to Original Papers button */}
                  {showingSelectedPapers && (
                    <ButtonBlue 
                      className="font-inter" 
                      text={<span className="font-semibold ml-1">Back to Original Papers</span>}
                      icon={<FaArrowLeft size={14} color="#FFFFFF" />} 
                      onClick={restoreOriginalPapers}
                    />
                  )}
                  
                  {/* Simple animated circle loading indicator */}
                  {isAnalyzing && (
                    <div className="flex items-center space-x-2">
                      <div className="loading-spinner"></div>
                      <span className="text-xs text-gray-600">Analyzing...</span>
                    </div>
                  )}
                  
                  <div className="w-[1.5px] h-8 bg-[#E3E6EA]" />
                  <div className="flex flex-row items-center justify-start space-x-3">
                    <TooltipIcon tooltip="Settings" icon={<FiSettings size={18} color="#666F8D" />}/>
                    <TooltipIcon 
                      tooltip="Remove selected papers" 
                      icon={<FiTrash size={18} color="#666F8D" />}
                      onClick={removeSelectedPapers}
                    />
                    <TooltipIcon tooltip="Download paper" icon={<FiDownload size={18} color="#666F8D" />}/>
                    <TooltipIcon 
                      tooltip="Archive selected papers to library" 
                      icon={<FiPackage size={18} color="#666F8D" />}
                      onClick={archiveSelectedPapers}
                    />
                  </div>
              </div>
              
              {/* Archive confirmation message */}
              {showArchiveConfirmation && (
                <div className="absolute top-4 right-4 bg-white p-3 rounded-md shadow-md border border-color-border-2 z-50 animate-fade-in">
                  <div className="flex items-center">
                    <FiPackage className="mr-2 text-darker-blue" size={18} />
                    <p className="text-sm text-darker-blue">{archiveMessage}</p>
                  </div>
                </div>
              )}
              
              {/* Remove confirmation message */}
              {showRemoveConfirmation && (
                <div className="absolute top-4 right-4 bg-white p-3 rounded-md shadow-md border border-color-border-2 z-50 animate-fade-in" style={{ top: showArchiveConfirmation ? '80px' : '16px' }}>
                  <div className="flex items-center">
                    <FiTrash className="mr-2 text-darker-blue" size={18} />
                    <p className="text-sm text-darker-blue">{removeMessage}</p>
                  </div>
                </div>
              )}
              
              <Reorder.Group 
                axis="y" 
                onReorder={setItems} 
                values={items}
                className="overflow-y-auto overflow-x-hidden"
              >
                  {items.map((item, index) => (
                      <div onMouseEnter={() => handleIsHovered(true, item.selected)}
                          onMouseLeave={() => handleIsHovered(false, item.selected)}>
                          <Item key={item.id} item={item} index={index} setSelected={handleSelected} allowDrag={false} pdfUrl={pdfUrl} setPdfUrl={setPdfUrl} />
                      </div>
                  ))}
              </Reorder.Group>
          </div>
        ) : (
          <div 
            className={`flex flex-col ${getPdfViewerWidthClass()} rounded-lg border border-color-border-2 h-full bg-white overflow-hidden pdf-viewer`}
            style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
            data-layout={pdfLayout}
          >
            <div className="flex flex-col h-full">
              <div className="flex flex-row items-center justify-between p-4 pl-6 font-inter font-medium border-b border-color-border-2">
                <h2 className="font-inter font-medium text-lg text-darker-blue">PDF Viewer</h2>
                <div className="flex flex-row items-center space-x-2">
                  <div className="flex flex-row items-center space-x-1 mr-4">
                    <button 
                      className={`p-1.5 rounded-md ${pdfLayout === "compact" ? "bg-color-bg-1 text-[#2388FF]" : "text-darker-blue hover:bg-color-bg-1"}`}
                      onClick={() => setPdfLayout("compact")}
                      title="Compact View"
                    >
                      <BsLayoutSidebarReverse size={20} />
                    </button>
                    <button 
                      className={`p-1.5 rounded-md ${pdfLayout === "wide" ? "bg-color-bg-1 text-[#2388FF]" : "text-darker-blue hover:bg-color-bg-1"}`}
                      onClick={() => setPdfLayout("wide")}
                      title="Wide View"
                    >
                      <BsLayoutSplit  size={20} />
                    </button>
                    <button 
                      className={`p-1.5 rounded-md ${pdfLayout === "full" ? "bg-color-bg-1 text-[#2388FF]" : "text-darker-blue hover:bg-color-bg-1"}`}
                      onClick={() => setPdfLayout("full")}
                      title="Full View"
                    >
                      <BsLayoutSidebar size={20} />
                    </button>
                  </div>
                  <button 
                    className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 cursor-pointer"
                    onClick={() => setPdfUrl(null)}
                  >
                    Back to Papers
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe 
                  src={pdfUrl.includes('arxiv.org/abs/') ? pdfUrl.replace('/abs/', '/pdf/') + '.pdf' : pdfUrl} 
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
