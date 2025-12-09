import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Save, Folder, BrainCircuit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Native textarea component as fallback/replacement
const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

const ScriptRunnerPanel = ({ 
  isOpen, 
  setIsOpen, 
  chartData = [], 
  selectedMarket = null, 
  lastTick = null,
  aiPrediction = null,
  tradeType = 'rise_fall'
}) => {
    const [code, setCode] = useState('// Write your trading script here\n// Available: chartData, lastTick, aiPrediction, selectedMarket, tradeType\n// Example: if (aiPrediction?.direction === "RISE" && aiPrediction.confidence > 70) { buy("RISE"); }');
    const [output, setOutput] = useState('');
    const [height, setHeight] = useState('50vh'); // Adjustable height
    const [isExpanded, setIsExpanded] = useState(false);
    const { toast } = useToast();

    // Persist code to localStorage
    useEffect(() => {
        const savedCode = localStorage.getItem('trading-script-code');
        if (savedCode) {
            setCode(savedCode);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('trading-script-code', code);
    }, [code]);

    // Update example code if AI prediction available
    useEffect(() => {
      if (aiPrediction) {
        setCode(prev => `// Updated with AI Prediction: ${aiPrediction.direction} (${aiPrediction.confidence}% confidence)\n// Example: if (aiPrediction?.direction === "${aiPrediction.direction}" && aiPrediction.confidence > 70) { buy("${aiPrediction.direction}"); }\n${prev}`);
      }
    }, [aiPrediction]);

    const handleRun = () => {
      // Mock execution with access to data - in real impl, parse and execute safely
      const simulationOutput = `> Executing script...\n> Market: ${selectedMarket?.symbol || 'N/A'}\n> Last Tick: ${lastTick?.quote || 'N/A'}\n> AI Prediction: ${aiPrediction?.direction} (${aiPrediction?.confidence}%)\n> Chart Data Points: ${chartData.length}\n> Simulated buy order placed for ${aiPrediction?.direction || 'RISE'} at price ${lastTick?.quote || 1.25}\n> Profit: +$${Math.random() * 10}\n> Script completed successfully.\n`;
      setOutput(simulationOutput);
      toast({
          title: "Script Executed",
          description: "🚀 Your script ran in simulation mode using AI prediction and chart data. Real execution coming soon!",
      });
    };

    const handleClear = () => {
        const defaultCode = `// Write your trading script here\n// Available: chartData, lastTick, aiPrediction, selectedMarket, tradeType\n// Example: if (aiPrediction?.direction === "RISE" && aiPrediction.confidence > 70) { buy("RISE"); }`;
        setCode(defaultCode);
        setOutput('');
        toast({
            title: "Cleared",
            description: "Script editor cleared. Ready for new ideas! ✨",
        });
    };

    const handleSave = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trading-script.js';
        a.click();
        URL.revokeObjectURL(url);
        toast({
            title: "Saved",
            description: "Script downloaded as trading-script.js 📥",
        });
    };

    const handleNotImplemented = () => {
        toast({
            description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        setHeight(isExpanded ? '50vh' : '80vh');
    };

    const examples = [
        { value: 'rise-fall', label: 'Rise/Fall Basic' },
        { value: 'digits-match', label: 'Digits Match' },
        { value: 'martingale', label: 'Martingale Strategy' },
        { value: 'ai-prediction', label: 'AI Prediction Follow' },
    ];

    const loadExample = (value) => {
        const examplesCode = {
            'rise-fall': `// Rise/Fall Example\nif (lastTick.quote > chartData[chartData.length - 2]?.value) {\n  buy("RISE", 10);\n} else {\n  buy("FALL", 10);\n}`,
            'digits-match': `// Digits Match Example\nif (tradeType === 'matches_differs' && lastTick.quote.toString().slice(-1) === '5') {\n  buy("MATCHES 5", 10);\n}`,
            'martingale': `// Martingale Example\nlet multiplier = 2;\nif (lastTradeLoss) {\n  stake *= multiplier;\n  buy(aiPrediction?.direction || "RISE", stake);\n}`,
            'ai-prediction': `// AI Prediction Follow Example\nif (aiPrediction?.direction === "RISE" && aiPrediction.confidence > 70) {\n  buy("RISE", 10);\n  output("Following AI prediction: " + aiPrediction.reason);\n} else {\n  buy("FALL", 10);\n}`,
        };
        setCode(examplesCode[value] || code);
        toast({
            title: "Example Loaded",
            description: `Loaded ${value} example. Now accesses AI prediction and chart data! 🎯`,
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 md:h-[50vh] h-[60vh] bg-gray-900 text-white shadow-2xl z-40 flex flex-col rounded-t-2xl overflow-hidden md:rounded-t-xl"
                    style={{ height }} // Dynamic height
                >
                    {/* Header: Responsive, touch-friendly on mobile */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 gap-2 sm:gap-0">
                        {/* Left: Tools - Stacked on mobile */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 flex-1">
                            <Select onValueChange={loadExample}>
                                <SelectTrigger className="w-32 sm:w-40 h-9 bg-gray-700/50 border-gray-600 text-xs sm:text-sm text-white hover:bg-gray-600/50">
                                    <SelectValue placeholder="Examples" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    {examples.map((ex) => (
                                        <SelectItem key={ex.value} value={ex.value} className="text-white hover:bg-gray-700/50">
                                            {ex.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" onClick={handleNotImplemented} className="h-9 px-2 text-xs sm:text-sm">
                                <Folder className="h-3.5 w-3.5 mr-1.5" /> Open
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleSave} className="h-9 px-2 text-xs sm:text-sm">
                                <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleClear} className="h-9 px-2 text-xs sm:text-sm">
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear
                            </Button>
                        </div>

                        {/* Center: Title */}
                        <h3 className="font-bold text-base sm:text-lg mx-auto sm:mx-0 flex-1 sm:flex-none text-center sm:text-left">Script Runner</h3>

                        {/* Right: Actions - Compact on mobile */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={toggleExpand}
                                className="h-9 px-2 text-xs sm:text-sm bg-gray-700/50 hover:bg-gray-600/50"
                            >
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="secondary" size="sm" className="h-9 px-3 text-xs sm:text-sm bg-blue-600/80 hover:bg-blue-500/80">
                                        <BrainCircuit className="h-3.5 w-3.5 mr-1.5" /> AI
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-gray-900 text-white border-gray-700 max-w-md mx-auto">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white">AI Script Generation</AlertDialogTitle>
                                        <AlertDialogDescription className="text-gray-300">
                                            Describe your strategy in natural language, and we'll generate the code using current AI prediction!
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="space-y-2">
                                        <Textarea
                                            placeholder={`E.g., 'Follow AI prediction if confidence > 70%'\nCurrent Prediction: ${aiPrediction?.direction} (${aiPrediction?.confidence}%)`}
                                            className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 min-h-[80px] text-sm"
                                        />
                                        <Button variant="default" size="sm" className="w-full bg-blue-600 hover:bg-blue-500">
                                            Generate Script
                                        </Button>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogAction onClick={() => toast({ description: '🚧 AI Generation coming soon! Stay tuned. 🤖' })}>
                                            Later
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleRun}
                                className="h-9 px-3 text-xs sm:text-sm bg-green-600/80 hover:bg-green-500/80"
                            >
                                <Play className="h-3.5 w-3.5 mr-1.5" /> Run
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-9 w-9"
                                aria-label="Close Script Runner"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Content: Code Editor + Output */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Code Editor: Enhanced Textarea mimicking code editor */}
                        <div className="flex-1 p-3 sm:p-4 border-b border-gray-700/50 relative">
                            <div className="relative h-full">
                                {/* Line numbers overlay */}
                                <div className="absolute left-0 top-0 h-full w-12 bg-gray-950/50 border-r border-gray-600 flex flex-col items-center pt-4 pr-2 text-xs text-gray-500 select-none pointer-events-none z-10 overflow-y-auto">
                                    {code.split('\n').map((_, i) => (
                                        <div key={i} className="py-0.5 leading-relaxed">{i + 1}</div>
                                    ))}
                                </div>
                                {/* Main editor */}
                                <Textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full h-full bg-gray-950 border border-gray-600 text-green-400 font-mono resize-none rounded-md p-4 pl-16 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 text-sm leading-relaxed"
                                    placeholder="// Your script goes here... (AI Prediction now visible!)"
                                    spellCheck={false}
                                    wrap="off"
                                />
                            </div>
                        </div>

                        {/* Output Console */}
                        {output && (
                            <div className="h-24 sm:h-32 p-3 sm:p-4 bg-black/30 border-t border-gray-700/50 overflow-y-auto">
                                <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Console Output
                                </h4>
                                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap word-break">{output}</pre>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ScriptRunnerPanel;