import { Reorder, useDragControls } from "framer-motion";
import SelectHandler from '/select-handler.svg';
import SelectHandlerSelected from '/select-handler-selected.svg';
import DragHandler from '/drag-handler.svg';
import DragHandlerSelected from '/drag-handler-selected.svg';
import { useState } from "react";

type ItemProp = {
  id: number;
  name: string;
  author: string;
  date: string;
  citation: number;
  summary: string;
  selected?: boolean;
  url: string;
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
          <span className="font-inter font-medium text-sm w-fit pr-3 text-darker-blue">{item.name}</span>
        </div>
          {(fold && 
            <div className="flex flex-row space-x-2">
              <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 flex flex-row">Citation: <h1 className="italic font-normal pl-1">{item.citation}</h1></span>
              <span className={`font-inter font-medium text-xs ${item.url === pdfUrl ? "text-[#2388FF]" : "text-darker-blue"} rounded-md tagShadow py-1 px-2 bg-color-bg-1 cursor-pointer`} 
                onClick={() => {if (item.url === pdfUrl) {setPdfUrl(null)} else {setPdfUrl(item.url);}}}
              >
                Click {item.url === pdfUrl ? "unread" : "to read"}
              </span>
            </div>
          )}
        </div>
      <div className={`flex flex-row w-full h-fit bg-transparent ${fold && "hidden"}`}>
        <div className="h-fit flex flex-col space-x-2 items-start justify-between w-full bg-white px-[8px] py-[10px] border border-color-border-2 rounded-md rounded-tl-none drop-shadow-[0_2px_4px_rgba(25,33,61,0.08)] hover:drop-shadow-md">
          <div className="flex flex-row w-full items-center justify-between border-b border-color-border-2 pb-3">
            <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 w-fit text-nowrap flex flex-row">Author: <h1 className="italic font-normal pl-1">{item.author}</h1></span>
            <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 w-fit text-nowrap flex flex-row">Date: <h1 className="italic font-normal pl-1">{item.date}</h1></span>
            <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 w-fit text-nowrap flex flex-row">Citation: <h1 className="italic font-normal pl-1">{item.citation}</h1></span>
          </div>
          <div className="text-[0.85rem] w-[30rem] h-fit font-inter font-normal text-color-text-grey pt-2 text-justify pr-1">
            Summary: {item.summary}
          </div>
        </div>
      </div>
    </div>
    </Reorder.Item>
  );
};
