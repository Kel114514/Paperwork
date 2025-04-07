import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export const TooltipIcon = ({ tooltip, icon, onClick }) => {
    return (  
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger className="hover:drop-shadow-lg cursor-pointer" onClick={onClick}>{icon}</TooltipTrigger>
                <TooltipContent>
                <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}