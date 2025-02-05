import * as React from "react";
import { useState, useEffect } from "react";
import { FiSettings, FiTrash, FiDownload, FiMinimize2 } from "react-icons/fi";
import { IoCopyOutline } from "react-icons/io5";
import { AiOutlineShareAlt } from "react-icons/ai";
import { GoBookmark } from "react-icons/go";
import { ButtonBlue } from "@/components/ui/buttonBlue";
import { Switch } from "@/components/ui/switch";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { GrRotateRight } from "react-icons/gr";
import { FaPaperPlane } from "react-icons/fa";
import { FiBook } from "react-icons/fi";
import { FiPaperclip } from "react-icons/fi";
import { FiImage } from "react-icons/fi";
import { GrMicrophone } from "react-icons/gr";
import AvatarUser from "/user-avatar.svg"
import AvatarAI from "/ai-avatar.svg"

export default function DialogView({title, model, initialDialogs}) {
  const [dialogs, setDialogs] = useState(initialDialogs);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [usePaperRef, setUserPaperRef] = useState(true);
  const [useAugSearch, setUserAugSearch] = useState(false);

  useEffect(() => {
    const targetDiv = document.getElementById("loadingText");
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      targetDiv.innerHTML = `Analysing Articles${".".repeat(dotCount)}`;
    }, 300);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (input.trim() === "") return;

    setDialogs([...dialogs, { text: input, sender: "user" }]);
    setInput("");
    setIsLoading(true);
    setCurrentText("");

    try {
      const aiResponse = await fetchAIResponse(input);
      setDialogs((prevDialogs) => [
        ...prevDialogs,
        { text: aiResponse, sender: "ai" },
      ]);
      typeAIResponse(aiResponse);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setDialogs((prevDialogs) => [
        ...prevDialogs,
        { text: "Sorry, I didn't understand that.", sender: "ai" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder for AI response (simulated for now)
  const fetchAIResponse = async (userMessage) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return `AI Response to: ${userMessage}`;
  };

  // Simulate the typing effect for AI response
  const typeAIResponse = (aiResponse) => {
    let index = 0;
    const typingSpeed = 50;
    const intervalId = setInterval(() => {
      setCurrentText((prevText) => prevText + aiResponse[index]);
      index += 1;
      if (index === aiResponse.length) {
        clearInterval(intervalId);
      }
    }, typingSpeed);
  };

  return (
    <div className="flex flex-col bg-[url('/bg-left.svg')] rounded-lg border border-color-border-2 h-[90vh] w-full drop-shadow-sm">
      <div className="flex-1 rounded-lg">
        <div className="flex flex-row items-center justify-center bg-white p-2 py-4 space-x-3 rounded-t-lg">
            <h1 className="font-inter font-medium text-base">{title}</h1>
            <div className="font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1">{model}</div>
        </div>
        <div className="p-2 rounded-lg py-4 overflow-y-auto h-[62vh]" style={{overflow: "overlay"}}>
            {/* Display all messages */}
            {dialogs.map((dialog, index) => (
                dialog.sender == "user" ? (
                    <div className="flex flex-row items-start justify-start w-full space-x-3 px-6">
                      <img src={AvatarUser} alt="" className="select-none pointer-events-none pt-1 size-8" />
                      <div className="flex flex-col">
                        <div className="flex flex-row items-center justify-start space-x-4">
                          <h1 className="text-[0.9rem] font-inter font-medium">{"Researcher"}</h1>
                          <h1 className="text-sm pt-0.5 font-inter font-medium text-color-text-grey">{dialog.time}</h1>
                        </div>
                        <div className="w-full text-[0.9rem] font-inter font-normal text-color-text-grey pt-2">{dialog.text}</div>
                      </div>
                    </div>
                ) : (
                  <div className="flex flex-col space-y-2 px-2 py-4 m-6 bg-white drop-shadow-sm border border-color-border-2 rounded-xl">
                    <div className="flex flex-row items-start justify-start w-full space-x-3 px-3 py-1">
                      <img src={AvatarAI} alt="" className="select-none pointer-events-none pt-1 size-8" />
                      <div className="flex flex-col">
                        <div className="flex flex-row items-center justify-start space-x-4">
                          <h1 className="text-[0.9rem] font-inter font-medium">{"Paper Master"}</h1>
                          <h1 className="text-sm pt-0.5 font-inter font-medium text-color-text-grey">{dialog.time}</h1>
                        </div>
                        <div className="text-[0.9rem] w-full font-inter font-normal text-color-text-grey pt-2">{dialog.text}</div>
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between h-7">
                      <div className="absolute left-2 bottom-3 flex flex-row space-x-4 pl-[3.2rem] pt-2 pb-2">
                        <GrRotateRight size={17} color="#666F8D"/>
                        <IoCopyOutline size={17} color="#666F8D"/>
                        <AiOutlineShareAlt size={17} color="#666F8D"/>
                        <GoBookmark size={17} color="#666F8D"/>
                        <HiOutlineDotsVertical size={17} color="#666F8D"/>
                      </div>
                      <div className="absolute right-2 bottom-4 font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 mr-2 bg-color-bg-1">50 tokens</div>
                    </div>
                  </div>
                )
            ))}
            {isLoading && (
              <div className="flex flex-col space-y-2 px-2 py-4 m-6 bg-white drop-shadow-sm border border-color-border-2 rounded-xl">
                <div className="flex flex-row items-start justify-start w-full space-x-3 px-3 py-1">
                  <img src={AvatarAI} alt="" className="select-none pointer-events-none size-8" />
                  <div className="flex flex-col">
                    <div id="loadingText" className="text-[0.9rem] w-full font-inter font-normal text-color-text-grey pt-1.5">{"Analysing Articles."}</div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Input area */}
      <div className="absolute bottom-0 w-[96.5%] flex flex-col items-center m-4 p-2 pt-3 rounded-xl border bg-white border-color-border-2 h-40 drop-shadow-sm">
        <textarea 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="flex-1 px-4 m-2 rounded-lg bg-white text-black placeholder-gray-500 h-full text-[0.9rem] w-full outline-none border-none focus:ring-0 focus:ring-offset-0 border-0"
          placeholder="How can I help you with the selected papers?"
        />
        <div className="flex flex-row items-center justify-between w-full p-2 pr-1 pb-1">
          <div className="flex flex-row space-x-4">
            <div className="flex flex-row font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 px-2 bg-color-bg-1 space-x-1 items-center justify-center">
              <FiBook size={16} color="#19213D"/>
              <h1>Library</h1>
            </div>
            <div className="flex flex-row items-center justify-center space-x-3">
              <FiPaperclip size={18} color="#666F8D"/>
              <FiImage size={18} color="#666F8D"/>
              <GrMicrophone size={18} color="#666F8D"/>
            </div>
          </div>
          
          <div className="flex flex-row space-x-3 pl-4 pr-1 font-inter font-medium text-xs text-darker-blue rounded-md tagShadow py-1 bg-color-bg-1 items-center justify-center">
            <label className="flex items-center space-x-2">
              <Switch 
                checked={usePaperRef} 
                onCheckedChange={setUserPaperRef} 
              />
              <span className="text-xs">Ask Selected Papers</span>
            </label>
            <label className="flex items-center space-x-2">
              <Switch 
                checked={useAugSearch} 
                onCheckedChange={setUserAugSearch} 
              />
              <span className="text-xs">Pro Search</span>
            </label>
            <ButtonBlue onClick={handleSendMessage} disabled={isLoading} text={"Send message"} icon={<FaPaperPlane className="mr-1" size={14} color="#FFFFFF"/>}/>
          </div>
        </div>
      </div>
    </div>
  );
}
