// import { buttonVariants } from "@/components/ui/button";
import PaperListView from "./components/paperListView";
import DialogView from "./components/dialogView";
import Logo from "/logo.svg"
import BetaBadge from "/beta-badge.svg"

function App() {
  const initialItems = [
    {
      id: 1,
      name: "Lorem ipsum dolorsi A",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore"
    },
    {
      id: 2,
      name: "Lorem ipsum dolorsi B",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore"
    },
    {
      id: 3,
      name: "Lorem ipsum dolorsi A",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore"
    },
    {
      id: 4,
      name: "Lorem ipsum dolorsi B",
      author: "James A Mike, Rachael B Dan",
      date: "2024.12.10",
      citation: 1240,
      summary: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore"
    }
  ]

  const title = "Papers related to CNN"
  const model = "GPT-4"

  const initialDialogs = [
    { id: 1, sender: 'user', time: '4:33PM', text: 'Lorem ipsum dolor sit amet consectetur tincidunt bibendum gravida phasellus sed dignissim id tempus ridiculus consectur dolor sit amet'},
    { id: 2, sender: 'ai', time: '4:33PM', text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ea commodo consequat conser dolor amer conserlormer' },
    { id: 3, sender: 'user', time: '4:33PM', text: 'Same here! Trying to debug this React component.' },
    { id: 4, sender: 'ai', time: '4:33PM', text: 'Need any help?' },
  ];

  return (
    <main className="flex flex-col min-h-screen min-w-screen bg-[#F7F8FA]">
      <div className="flex flex-row font-inter items-center justify-start space-x-2 w-full h-14 bg-white drop-shadow mb-4 pl-5">
        <img src={Logo} alt="" className="select-none pointer-events-none pt-0.5 size-7" />
        <h1 className="text-xl font-medium font-handStand pt-1">Paper Work</h1>
        <h1 className="text-sm italic pt-0.5">- AI Research Paper Browser</h1>
        <img src={BetaBadge} alt="" className="select-none pointer-events-none pt-0.5 h-8" />
      </div>
      <div className="flex flex-row items-center justify-center w-full h-full space-x-8 px-4 overflow-hidden">
        <DialogView title={title} model={model} initialDialogs={initialDialogs}/>
        <PaperListView initialItems={initialItems}/>
      </div>
    </main>
  );
}

export default App;
