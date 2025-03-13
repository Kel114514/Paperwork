// import { buttonVariants } from "@/components/ui/button";
import PaperListView from "./components/paperListView";
import DialogView from "./components/dialogView";
import PaperPreview from "./components/paperPreview"
import HomeListView from "./components/HomeListView";
import { useState, useEffect } from "react";
import Logo from "/logo.svg"
import LibaButton from "/to-your-liba.svg"
import BackChatButton from "/back-to-chat.svg"
import { AnimatePresence, motion } from "framer-motion";
import { FiHome } from "react-icons/fi";
import { FiBook } from "react-icons/fi";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { searchAPI } from "./components/backendHandler";

function App() {
  const title = "Papers related to CNN"
  const model = "GPT-4"

  const initialItems = [
    {
      id: 1,
      name: "Lorem ipsum dolorsi A",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_150kB.pdf"
    },
    {
      id: 2,
      name: "Lorem ipsum dolorsi B",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_0.5MB.pdf"
    },
    {
      id: 3,
      name: "Lorem ipsum dolorsi A",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_1MB.pdf"
    },
    {
      id: 4,
      name: "Lorem ipsum dolorsi B",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore, Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_5MB.pdf"
    }
  ]

  const initialHomeItems = [
    {
      id: 1,
      name: "Lorem ipsum dolorsi A",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_150kB.pdf"
    },
    {
      id: 2,
      name: "Lorem ipsum dolorsi B",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore",
      url: "https://www.graydart.com/app-media/documents/pdf/dev_sample_pdf_file_0.5MB.pdf"
    },
  ]

  const initialDialogs = [
    { id: 1, sender: 'user', time: '4:33PM', text: 'Lorem ipsum dolor sit amet consectetur tincidunt bibendum gravida phasellus sed dignissim id tempus ridiculus consectur dolor sit amet'},
    { id: 2, sender: 'ai', time: '4:33PM', text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ea commodo consequat conser dolor amer conserlormer' },
    { id: 3, sender: 'user', time: '4:33PM', text: 'Same here! Trying to debug this React component.' },
    { id: 4, sender: 'ai', time: '4:33PM', text: 'Need any help?' },
  ];

  const [papers, setPapers] = useState(initialItems)
  const [homePapers, setHomePapers] = useState(initialHomeItems)
  const [dialogs, setDialogs] = useState(initialDialogs)
  const [home, setHome] = useState(false);
  const [firstSelectTrigger, setFirstSelectTrigger] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleHome = (home) => {
    setHome(home);
  };

  useEffect(() => {
    console.log(pdfUrl);
  }, [PaperPreview]); 

  useEffect(() => {
    setIsAnimating(true);
  }, [home]); 

  const handleAnimationComplete = () => {
    setIsAnimating(false);
  };

  const handleAskSelectedPaper = () => {
    const selectedHomePapers = homePapers.filter(paper => paper.selected === true);
    papers.unshift(...selectedHomePapers);
    setPapers(papers);
    setHome(false);
    console.log("pressed");
  };

  // Helper function to convert search query to dialog
  const searchToDialog = (query) => {
    const moment = new Date();
    const time = moment.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    const newDialog = { id: 1, sender: 'user', time: time, text: query };
    const newAiResponse = { id: 2, sender: 'ai', time: time, text: 'Searching for ' + query + '...' };
    return [newDialog, newAiResponse];
  };

  // Demo paper searching function
  const handleSearch = (query) => {
    console.log("Searching for: " + query);

    // update the dialog with the search query, and clear the previous search results
    const SearchDialog = searchToDialog(query);
    setDialogs(SearchDialog);

    // Clear the previous search results temporarily
    setPapers([]);

    searchAPI(query).then((data) => {
      console.log(data);
      // Change the papers to the search results
      setPapers(data);
    });
  }

  // Run the search function on startup
  useEffect(() => {
    handleSearch("Keyword");
  }, []);

  return (
    <main className="flex flex-col min-h-screen min-w-screen bg-[#F7F8FA] overflow-hidden">
      <div className="flex flex-row items-center justify-between w-full bg-white drop-shadow mb-2 pl-5">
        <div className="flex flex-row font-inter items-center justify-start space-x-2 w-[80%] h-14">
          <img src={Logo} alt="" className="select-none pointer-events-none pt-0.5 size-7" />
          <h1 className="text-xl font-medium font-handStand pt-1">Paper Work</h1>
          <h1 className="text-sm italic pt-0.5">- AI Research Paper Browser</h1>
        </div>
        <div className="flex flex-row space-x-3 mr-4">
          <img src={home ? BackChatButton : LibaButton} alt="" className="pt-0.5 h-9.5"
            style={{ transition: "filter 0.3s ease" }}
            onMouseEnter={(e) => {e.target.style.filter = "drop-shadow(0px 3px 8px rgba(35, 136, 255, 0.2))";}}
            onMouseLeave={(e) => {e.target.style.filter = "none";}}
            onClick={() => {handleHome(!home);}}
          />
          <Avatar className="size-9 mr-4" onClick={() => {handleHome(true);}}>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
      </div>
        {home ? (
            <motion.div
              key="home-view"
              className="flex flex-row items-center justify-center w-full h-full space-x-8 px-4 overflow-hidden"
              initial={{ opacity: 1, x: 1000 }} // HomeListView starts from the right
              animate={{ opacity: 1, x: 0 }} // It slides in from the right
              transition={{ duration: 0.5 }}
            >
              <HomeListView items={homePapers} setItems={setHomePapers} handleAskSelectedPaper={handleAskSelectedPaper} 
                pdfUrl={pdfUrl} setPdfUrl={setPdfUrl} />
              <PaperPreview pdfUrl={pdfUrl} />
            </motion.div>
          ) : (
            <motion.div
              key="dialog-view"
              className="flex flex-row items-center justify-center w-full h-full space-x-8 px-4 mt-2"
              initial={{ opacity: 1, x: -1000 }} // DialogView starts in the center
              animate={{ opacity: 1, x: 0 }} // Slide out to the right
              transition={{ duration: 0.5 }}
              onAnimationComplete={handleAnimationComplete}
            >
              {!isAnimating 
              ? <DialogView title={title} model={model} dialogs={dialogs}
                setDialogs={setDialogs} handleHome={handleHome}
                papers={papers} setPapers={setPapers}
                firstSelectTrigger={firstSelectTrigger}
              /> 
              : <div className="flex flex-col bg-gradient-to-b from-[#f7f8fa] via-[#f6f7fa] to-[#eef0fa] rounded-lg border border-color-border-2 h-[90vh] w-full"
                  style={{ boxShadow: '0 3px 3px rgb(0, 0, 0, 0.12)' }}
                />
              }
              <PaperListView items={papers} setItems={setPapers}
                firstSelectTrigger={firstSelectTrigger}
                setFirstSelectTrigger={setFirstSelectTrigger}
                pdfUrl={pdfUrl}
                setPdfUrl={setPdfUrl}
              />
            </motion.div>
          )
        }
    </main>
  );
}

export default App;
