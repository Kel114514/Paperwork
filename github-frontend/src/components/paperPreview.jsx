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

export default function PaperPreview({pdfUrl}) {
    return (
        <div className="relative flex flex-col rounded-lg border border-color-border-2 h-[90vh] bg-white w-full overflow-hidden bg-gradient-to-b from-[#f7f8fa] via-[#f6f7fa] to-[#eef0fa] "
            style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
        >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <h2 className="font-inter font-light text-md text-color-text-grey">{pdfUrl === null && "Click research paper read button to preview."}</h2>
            </div>
            <object data={pdfUrl} type="application/pdf" width="100%" height="100%">
                <p>Loading Research Paper...</p>
            </object>
        </div>
    );
}