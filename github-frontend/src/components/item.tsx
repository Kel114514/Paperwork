import { useMotionValue, Reorder } from "framer-motion";
import { useRaisedShadow } from "./use-raised-shadow";
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
};

interface Props {
  item: ItemProp;
  index: number;
  setSelected: (id: number, isSelected: boolean) => void;
}


export const Item = ({ item, index, setSelected }: Props) => {
  const y = useMotionValue(0);
  const boxShadow = useRaisedShadow(y);
  const [thisSelected, setThisSelected] = useState(false);

  const handleSelected = () => {
    setSelected(item.id, !thisSelected);
    setThisSelected(!thisSelected);
  };

  return (
    <Reorder.Item id={item.id} value={item} style={{ boxShadow, y }} class="w-full border border-color-border-2 rounded-md drop-shadow-[0_2px_4px_rgba(25,33,61,0.08)] hover:drop-shadow-md">
      <div onClick={handleSelected} className="flex flex-row w-[30rem] space-x-2 items-center justify-between">
        <div className="flex flex-row space-x-2 items-center justify-between">
          <img className={`select-none pointer-events-none pt-0.5 ${thisSelected ? "mr-0.5" : "mr-0"}`} 
            src={thisSelected ? DragHandlerSelected : DragHandler} alt="" 
          />
          <span className="text-xs w-6 h-6 shrink-0 grow-0 flex items-center justify-center rounded-full border border-color-border-2 text-blue-500 text-center">
            {index}
          </span>
          <span className="font-inter font-medium text-sm w-60 text-darker-blue">{item.name}</span>
        </div>
        <span className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1">Citation: {item.citation}</span>
      </div>
    </Reorder.Item>
  );
};
