import { Reorder, useDragControls } from "framer-motion";
import SelectHandler from '/select-handler.svg';
import SelectHandlerSelected from '/select-handler-selected.svg';
import DragHandler from '/drag-handler.svg';
import DragHandlerSelected from '/drag-handler-selected.svg';
import { useState } from "react";
import { FiStar, FiTarget, FiZap, FiCheckSquare } from "react-icons/fi";

// Function to shorten author names
const shortenAuthorName = (authorName: string, maxLength: number = 45) => {
  if (authorName.length <= maxLength) return authorName;
  return authorName.substring(0, maxLength) + "...";
};

type ItemProp = {
  id: number;
  name: string;
  author: string;
  date: string;
  citation: number;
  summary: string;
  selected?: boolean;
  url: string;
  analysis?: {
    relevance?: {
      rating: number;
      explanation: string;
    };
    technical_innovation?: {
      rating: number;
      explanation: string;
    };
    feasibility?: {
      rating: number;
      explanation: string;
    };
  };
};

interface Props {
  item: ItemProp;
  index: number;
  setSelected: (id: number, isSelected: boolean) => void;
  allowDrag: boolean;
  pdfUrl: string;
  setPdfUrl: (url: string | null) => void;
}


export const Item = ({ item, index, setSelected, allowDrag, pdfUrl, setPdfUrl }: Props) => {
  // const y = useMotionValue(0);
  // const boxShadow = useRaisedShadow(y);
  const [thisSelected, setThisSelected] = useState(item.selected);
  const [fold, setFold] = useState(true);
  const controls = useDragControls()

  const handleSelected = () => {
    setSelected(item.id, !thisSelected);
    setThisSelected(!thisSelected);
  };

  // Function to render rating stars
  const renderRating = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      stars.push(
        <FiStar 
          key={i} 
          className={`${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} 
          size={12} 
        />
      );
    }
    return <div className="flex flex-row space-x-0.5">{stars}</div>;
  };

  return (
    <Reorder.Item id={item.id} value={item} dragListener={false} dragControls={controls}
      transition={{ duration: 0, ease: "linear" }}>
    <div className={`w-full items-start justify-start ${!fold && "flex flex-col"}`}>
      <div className={`flex flex-row space-x-2 items-center justify-between bg-white ${fold ? "w-full" : "w-fit"} px-[8px] py-[10px] border border-color-border-2 rounded-md
        ${fold ? "drop-shadow-[0_2px_4px_rgba(25,33,61,0.08)] hover:drop-shadow-md" : "z-20 rounded-b-none border-b-0 py-[8px]"}`}>
        <div className="select-none flex flex-row space-x-2 items-center justify-between">
          <img className={`reorder-handle select-none pointer-events-none ${allowDrag ? "pl-0.5" : "pl-1 pr-1 ml-0"}`} 
            src={thisSelected 
              ? (allowDrag ? DragHandlerSelected : SelectHandlerSelected)
              : (allowDrag ? DragHandler: SelectHandler)
            } alt="" 
          />
          <div onClick={handleSelected} onPointerDown={(e) => {if (allowDrag) {controls.start(e)}}}
            className={`absolute h-10 w-16 left-0 bg-transparent ${allowDrag && "cursor-grab"}`}/>
          <div onClick={() => {setFold(!fold)}} className={`absolute h-10 w-80 left-20 bg-transparent cursor-pointer`}/>
          <span className="text-xs w-6 h-6 shrink-0 grow-0 flex items-center justify-center rounded-full border border-color-border-2 text-blue-500 text-center">
            {index}
          </span>
          <span className={`font-inter font-medium text-sm w-fit pr-3 text-darker-blue ${fold ? "line-clamp-2" : ""}`}>{item.name}</span>
        </div>
          {(fold && 
            <div className="flex flex-row space-x-2">
              {item.analysis && (
                <>
                  {fold ? (
                    <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 flex flex-row items-center">
                      <FiTarget className="mr-1" size={14} />
                      {item.analysis.relevance ? item.analysis.relevance.rating : "N/A"}
                      <FiZap className="ml-2 mr-1" size={14} />
                      {item.analysis.technical_innovation ? item.analysis.technical_innovation.rating : "N/A"}
                      <FiCheckSquare className="ml-2 mr-1" size={14} />
                      {item.analysis.feasibility ? item.analysis.feasibility.rating : "N/A"}
                    </span>
                  ) : (
                    <>
                      <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 flex flex-row">
                        Relevance: {item.analysis.relevance ? renderRating(item.analysis.relevance.rating) : "N/A"}
                      </span>
                      <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 flex flex-row">
                        Innovation: {item.analysis.technical_innovation ? renderRating(item.analysis.technical_innovation.rating) : "N/A"}
                      </span>
                      <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 flex flex-row">
                        Feasibility: {item.analysis.feasibility ? renderRating(item.analysis.feasibility.rating) : "N/A"}
                      </span>
                    </>
                  )}
                </>
              )}
              <div className="flex flex-row space-x-2">
                <span className="w-fit min-w-[5.5rem] font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 flex flex-row whitespace-nowrap">Citation: <h1 className="italic font-normal pl-1">{item.citation}</h1></span>
                <span className={`font-inter font-medium text-xs ${item.url === pdfUrl ? "text-[#2388FF]" : "text-darker-blue"} rounded-md tagShadow py-1 px-2 bg-color-bg-1 cursor-pointer whitespace-nowrap`} 
                  onClick={() => {
                    if (item.url === pdfUrl) {
                      setPdfUrl(null);
                    } else {
                      // Set the pdfUrl state to show the selected state
                      setPdfUrl(item.url);
                    }
                  }}
                >
                  Click {item.url === pdfUrl ? "unread" : "to read"}
                </span>
              </div>
            </div>
          )}
        </div>
      <div className={`flex flex-row w-[38.85rem] h-fit bg-transparent ${fold && "hidden"}`}>
        <div className="h-fit flex flex-col items-start justify-between w-full bg-white px-4 py-[10px] border border-color-border-2 rounded-md rounded-tl-none drop-shadow-[0_2px_4px_rgba(25,33,61,0.08)] hover:drop-shadow-md">
          <div className="flex flex-row w-full items-center justify-between border-b border-color-border-2 pb-3">
            <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 w-fit text-nowrap flex flex-row group relative">
              Author: <h1 className="italic font-normal pl-1">{shortenAuthorName(item.author)}</h1>
              <div className="absolute h-6 bottom-full left-0 top-8 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {item.author}
              </div>
            </span>
            <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 w-fit text-nowrap flex flex-row">Date: <h1 className="italic font-normal pl-1">{item.date}</h1></span>
            <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 text-nowrap flex flex-row">Citation: <h1 className="italic font-normal pl-1">{item.citation}</h1></span>
          </div>
          <div className="text-[0.85rem] w-full h-fit font-inter font-normal text-color-text-grey pt-2 text-justify">
            Summary: {item.summary}
          </div>
          
          {item.analysis && (
            <div className="flex flex-col w-full mt-4 border-t border-color-border-2 pt-3">
              <h3 className="font-inter font-medium text-sm text-darker-blue mb-2">Paper Analysis</h3>
              
              {item.analysis.relevance && (
                <div className="mb-3">
                  <div className="flex flex-row items-center justify-between mb-1">
                    <span className="font-inter font-medium text-xs text-darker-blue">相关度 (Relevance):</span>
                    <div className="flex flex-row items-center">
                      <span className="font-inter font-medium text-xs text-darker-blue mr-2">{item.analysis.relevance.rating}/10</span>
                      {renderRating(item.analysis.relevance.rating)}
                    </div>
                  </div>
                  <p className="text-[0.8rem] text-color-text-grey text-justify">{item.analysis.relevance.explanation}</p>
                </div>
              )}
              
              {item.analysis.technical_innovation && (
                <div className="mb-3">
                  <div className="flex flex-row items-center justify-between mb-1">
                    <span className="font-inter font-medium text-xs text-darker-blue">技术创新点 (Technical Innovation):</span>
                    <div className="flex flex-row items-center">
                      <span className="font-inter font-medium text-xs text-darker-blue mr-2">{item.analysis.technical_innovation.rating}/10</span>
                      {renderRating(item.analysis.technical_innovation.rating)}
                    </div>
                  </div>
                  <p className="text-[0.8rem] text-color-text-grey text-justify">{item.analysis.technical_innovation.explanation}</p>
                </div>
              )}
              
              {item.analysis.feasibility && (
                <div className="mb-3">
                  <div className="flex flex-row items-center justify-between mb-1">
                    <span className="font-inter font-medium text-xs text-darker-blue">可操作性 (Feasibility):</span>
                    <div className="flex flex-row items-center">
                      <span className="font-inter font-medium text-xs text-darker-blue mr-2">{item.analysis.feasibility.rating}/10</span>
                      {renderRating(item.analysis.feasibility.rating)}
                    </div>
                  </div>
                  <p className="text-[0.8rem] text-color-text-grey text-justify">{item.analysis.feasibility.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </Reorder.Item>
  );
};
