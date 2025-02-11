import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export const TooltipIcon = ({ tooltip, icon }) => {
    const handleSelected = (id, isSelected) => {
        setItems((prevItems) =>
            prevItems.map((item) =>
            item.id === id ? { ...item, selected: isSelected } : item
            )
        );
    };

    return (  
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger className="hover:drop-shadow-lg">{icon}</TooltipTrigger>
                <TooltipContent>
                <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}