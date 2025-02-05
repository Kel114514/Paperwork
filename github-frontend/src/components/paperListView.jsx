import * as React from "react";
import { useState } from "react";
import { Reorder } from "framer-motion";
import { Item } from "./item";
import { FiSettings } from "react-icons/fi";
import { FiTrash } from "react-icons/fi";
import { FiDownload } from "react-icons/fi";
import { FiMinimize2 } from "react-icons/fi";
import { ButtonBlue } from "@/components/ui/buttonBlue"
import { FaAngleRight } from "react-icons/fa6";

export default function PaperListView({initialItems}) {
    const [items, setItems] = useState(initialItems);

    const handleSelected = (id, isSelected) => {
        setItems((prevItems) =>
            prevItems.map((item) =>
            item.id === id ? { ...item, selected: isSelected } : item
            )
        );
    };

    return (
        <div className="flex flex-col rounded-lg border border-color-border-2 p-2 h-full bg-white drop-shadow-sm">
            <h1 className="font-inter font-medium text-darker-blue mb-2 mt-3 pl-3">Select and rank your interest papers</h1>
            <div className="flex flex-row items-center justify-start px-3 space-x-4">
                <ButtonBlue className="font-inter" text="Rank Papers By" icon={<FaAngleRight size={14} color="#FFFFFF"/>}/>
                <div className="w-[1.5px] h-8 bg-[#F0F2F5]"></div>
                <div className="flex flex-row items-center justify-start space-x-3">
                    <FiSettings size={18} color="#666F8D"/>
                    <FiTrash size={18} color="#666F8D"/>
                    <FiDownload size={18} color="#666F8D"/>
                    <FiMinimize2 size={18} color="#666F8D"/>
                </div>
            </div>
            <Reorder.Group axis="y" onReorder={setItems} values={items}>
                {items.map((item, index) => (
                    <Item key={item.id} item={item} index={index} setSelected={handleSelected} />
                ))}
            </Reorder.Group>
        </div>
    );
}