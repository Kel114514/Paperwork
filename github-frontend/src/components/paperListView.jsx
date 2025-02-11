import * as React from "react";
import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import { Item } from "./item";
import { FiSettings } from "react-icons/fi";
import { FiTrash } from "react-icons/fi";
import { FiDownload } from "react-icons/fi";
import { FiMinimize2 } from "react-icons/fi";
import { ButtonBlue } from "@/components/ui/buttonBlue";
import { TooltipIcon } from "./ui/tooltipIcon";
import { FaAngleRight } from "react-icons/fa6";
import { FiPackage } from "react-icons/fi";

export default function PaperListView({ items, setItems, firstSelectTrigger, setFirstSelectTrigger, pdfUrl, setPdfUrl }) {
  const [isHovered, setIsHovered] = useState(false); // State to track hover
  const [isAskHovered, setIsAskHovered] = useState(false); // State to track hover

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

  return (
    <div className="flex flex-col h-[90vh] space-y-4">
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
                    Ask
                </h1>
                your interest papers
            </div>
            <div className="flex flex-row items-center justify-start px-3 space-x-4">
                <ButtonBlue className="font-inter" text="Rank Papers By" icon={<FaAngleRight size={14} color="#FFFFFF" />} />
                <div className="w-[1.5px] h-8 bg-[#F0F2F5]" />
                <div className="flex flex-row items-center justify-start space-x-3">
                <TooltipIcon tooltip="Settings" icon={<FiSettings size={18} color="#666F8D" />}/>
                <TooltipIcon tooltip="Remove selected papers" icon={<FiTrash size={18} color="#666F8D" />}/>
                <TooltipIcon tooltip="Download paper" icon={<FiDownload size={18} color="#666F8D" />}/>
                <TooltipIcon tooltip="Archive selected papers to library" icon={<FiPackage size={18} color="#666F8D" />}/>
                </div>
            </div>
            <Reorder.Group axis="y" onReorder={setItems} values={items}>
                {items.map((item, index) => (
                    <div onMouseEnter={() => handleIsHovered(true, item.selected)}
                        onMouseLeave={() => handleIsHovered(false, item.selected)}>
                        <Item key={item.id} item={item} index={index} setSelected={handleSelected} allowDrag={false} pdfUrl={pdfUrl} setPdfUrl={setPdfUrl} />
                    </div>
                ))}
            </Reorder.Group>
        </div>
        {pdfUrl !== null && <div 
            className="flex flex-col rounded-lg border border-color-border-2 h-[80vh] bg-white w-full overflow-hidden"
            style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
        >
            <object data={pdfUrl} type="application/pdf" width="100%" height="100%">
                <p>Loading Research Paper...</p>
            </object>
        </div>
        }
    </div>
  );
}
