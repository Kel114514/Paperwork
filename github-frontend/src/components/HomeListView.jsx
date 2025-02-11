import * as React from "react";
import { useState } from "react";
import { Reorder } from "framer-motion";
import { Item } from "./item";
import { FiSettings } from "react-icons/fi";
import { FiTrash } from "react-icons/fi";
import { FiDownload } from "react-icons/fi";
import { FiMinimize2 } from "react-icons/fi";
import { ButtonBlue } from "@/components/ui/buttonBlue"
import { FiMessageSquare } from "react-icons/fi";
import { TooltipIcon } from "./ui/tooltipIcon";


export default function HomeListView({items, setItems, handleAskSelectedPaper, pdfUrl, setPdfUrl}) {
    const handleSelected = (id, isSelected) => {
        setItems((prevItems) =>
            prevItems.map((item) =>
            item.id === id ? { ...item, selected: isSelected } : item
            )
        );
    };

    return (
        <div className="flex flex-col rounded-lg border border-color-border-2 p-2 ml-1 h-[90vh] bg-white my-2"
            style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
        >
            <h1 className="font-inter font-medium text-darker-blue mb-2 mt-3 pl-3">Personal archived papers</h1>
            <div className="flex flex-row items-center justify-start px-3 space-x-4">
                <ButtonBlue className="font-inter" text="Ask Select Papers" icon={<FiMessageSquare size={15} color="#FFFFFF"/>}
                    onClick={handleAskSelectedPaper}/>
                <div className="w-[1.5px] h-8 bg-[#F0F2F5]"></div>
                <div className="flex flex-row items-center justify-start space-x-3">
                    <TooltipIcon tooltip="Settings" icon={<FiSettings size={18} color="#666F8D" />}/>
                    <TooltipIcon tooltip="Remove selected papers" icon={<FiTrash size={18} color="#666F8D" />}/>
                    <TooltipIcon tooltip="Download paper" icon={<FiDownload size={18} color="#666F8D" />}/>
                    <TooltipIcon tooltip="Minimize the left slide" icon={<FiMinimize2 size={18} color="#666F8D"/>}/>
                </div>
            </div>
            <Reorder.Group axis="y" onReorder={setItems} values={items}>
                {items.map((item, index) => (
                    <Item key={item.id} item={item} index={index} setSelected={handleSelected} allowDrag={true} pdfUrl={pdfUrl} setPdfUrl={setPdfUrl}/>
                ))}
            </Reorder.Group>
        </div>
    );
}