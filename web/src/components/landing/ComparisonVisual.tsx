import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileCode, ArrowRight, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function ComparisonVisual() {
    const [isClean, setIsClean] = useState(false);

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* Controls */}
            <div className="flex justify-center mb-8">
                <div className="bg-white dark:bg-slate-900 p-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
                    <div
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer flex items-center",
                            !isClean ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        )}
                        onClick={() => setIsClean(false)}
                    >
                        <X className="w-4 h-4 mr-2" />
                        Legacy Comments
                    </div>
                    <Switch
                        checked={isClean}
                        onCheckedChange={setIsClean}
                        className="data-[state=checked]:bg-brand-orange"
                    />
                    <div
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer flex items-center",
                            isClean ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        )}
                        onClick={() => setIsClean(true)}
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Context Notes
                    </div>
                </div>
            </div>

            {/* Editor Window */}
            <div className="relative bg-slate-950 rounded-xl shadow-2xl overflow-hidden border border-slate-800 ring-1 ring-slate-900/5">
                {/* Window Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                        <div className="flex space-x-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/20" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                            <div className="w-3 h-3 rounded-full bg-green-500/20" />
                        </div>
                        <div className="h-4 w-px bg-slate-800 mx-2" />
                        <div className="flex items-center text-xs text-slate-400 font-mono bg-slate-800/50 px-3 py-1 rounded-md border border-slate-700/50">
                            <FileCode className="w-3.5 h-3.5 mr-2 text-blue-400" />
                            payment-processor.ts
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">TypeScript</div>
                </div>

                <div className="flex h-[400px]">
                    {/* Code Area */}
                    <div className="flex-1 p-6 font-mono text-sm overflow-hidden relative">
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-900/30 border-r border-slate-800/50 flex flex-col items-center py-6 text-slate-600 select-none">
                            {Array.from({ length: 15 }).map((_, i) => (
                                <div key={i} className="h-6 text-xs">{i + 1}</div>
                            ))}
                        </div>

                        <div className="pl-10 space-y-1">
                            <CodeLine line="interface PaymentConfig {" />
                            <CodeLine line="  gateway: string;" indent={1} />
                            <CodeLine line="  timeout: number;" indent={1} />
                            <CodeLine line="}" />
                            <div className="h-4" />

                            <CodeLine line="async function processPayment(config: PaymentConfig) {" />

                            {/* Clutter Comment 1 */}
                            <AnimatePresence>
                                {!isClean && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pl-4 py-1 text-slate-500 italic flex items-center bg-red-500/5 border-l-2 border-red-500/30 my-1">
                                            <span>// TODO: This timeout logic is flaky on weekends. Needs fix.</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <CodeLine line="const response = await api.post('/charge', {" indent={1} />
                            <CodeLine line="amount: config.amount," indent={2} />
                            <CodeLine line="timeout: config.timeout," indent={2} />
                            <CodeLine line="});" indent={1} />

                            {/* Clutter Comment 2 */}
                            <AnimatePresence>
                                {!isClean && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pl-4 py-1 text-slate-500 italic flex items-center bg-red-500/5 border-l-2 border-red-500/30 my-1">
                                            <span>// FIXME: Legacy API endpoint. Migration planned for Q4.</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <CodeLine line="if (response.status !== 200) {" indent={1} />
                            <CodeLine line="throw new Error('Payment failed');" indent={2} />
                            <CodeLine line="}" indent={1} />
                            <CodeLine line="return response.data;" indent={1} />
                            <CodeLine line="}" />
                        </div>
                    </div>

                    {/* Context Sidebar */}
                    <motion.div
                        className="border-l border-slate-800 bg-slate-900/50"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{
                            width: isClean ? 300 : 0,
                            opacity: isClean ? 1 : 0
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    >
                        <div className="w-[300px] h-full flex flex-col">
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Context Notes</span>
                                <span className="text-[10px] bg-brand-orange/20 text-brand-orange px-2 py-0.5 rounded-full">2 Active</span>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto">
                                {/* Note 1 */}
                                <motion.div
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-brand-orange/30 transition-colors group cursor-pointer"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                                            <span className="text-xs font-medium text-slate-300">Line 8</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">Just now</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        <span className="text-brand-orange font-medium">TODO:</span> This timeout logic is flaky on weekends. Needs fix.
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-slate-700/30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex -space-x-1">
                                            <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-slate-800" />
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-slate-500" />
                                    </div>
                                </motion.div>

                                {/* Note 2 */}
                                <motion.div
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-brand-orange/30 transition-colors group cursor-pointer"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                                            <span className="text-xs font-medium text-slate-300">Line 12</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">2d ago</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        <span className="text-blue-400 font-medium">FIXME:</span> Legacy API endpoint. Migration planned for Q4.
                                    </p>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function CodeLine({ line, indent = 0 }: { line: string; indent?: number }) {
    // Simple syntax highlighting simulation
    const parts = line.split(/(\s+|[{}().,;:'"]|const|async|function|interface|return|throw|new|if|await)/g);

    return (
        <div className="flex" style={{ paddingLeft: `${indent * 1.5}rem` }}>
            <div className="text-slate-300">
                {parts.map((part, i) => {
                    if (!part) return null;
                    let color = "text-slate-300";
                    if (["const", "async", "function", "interface", "return", "throw", "new", "if", "await"].includes(part)) color = "text-purple-400";
                    else if (["string", "number", "PaymentConfig", "Error"].includes(part)) color = "text-yellow-300";
                    else if (part.startsWith("'")) color = "text-green-400";
                    else if (["gateway", "timeout", "amount", "status", "data"].includes(part)) color = "text-blue-300";

                    return <span key={i} className={color}>{part}</span>;
                })}
            </div>
        </div>
    );
}
