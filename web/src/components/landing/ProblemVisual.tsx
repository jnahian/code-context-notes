import { motion } from "framer-motion";
import { FileCode, XCircle } from "lucide-react";

export function ProblemVisual() {
    return (
        <div className="relative w-full max-w-md mx-auto">
            {/* Messy File Window */}
            <motion.div
                className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden"
                initial={{ opacity: 0, rotate: -2 }}
                whileInView={{ opacity: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                {/* Header */}
                <div className="flex items-center px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                    <div className="flex space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                    </div>
                    <div className="ml-3 text-xs text-slate-500 font-mono flex items-center">
                        <FileCode className="w-3 h-3 mr-1.5" />
                        messy_component.ts
                    </div>
                </div>

                {/* Code Content with Clutter */}
                <div className="p-4 font-mono text-xs leading-relaxed">
                    {/* Code Line */}
                    <div className="flex items-center">
                        <span className="text-slate-400 w-6 select-none">1</span>
                        <span className="text-purple-600 dark:text-purple-400">const</span> <span className="text-blue-600 dark:text-blue-400 ml-2">data</span> <span className="text-slate-600 dark:text-slate-300">=</span> <span className="text-slate-600 dark:text-slate-300">fetchData();</span>
                    </div>

                    {/* Clutter Comments */}
                    <motion.div
                        className="flex items-start bg-red-50 dark:bg-red-900/10 -mx-4 px-4 py-1 my-1 border-l-2 border-red-400"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="text-slate-400 w-6 select-none">2</span>
                        <span className="text-red-500/70 dark:text-red-400/70 italic">// TODO: Refactor this later, it's causing memory leaks in prod</span>
                    </motion.div>

                    {/* Code Line */}
                    <div className="flex items-center">
                        <span className="text-slate-400 w-6 select-none">3</span>
                        <span className="text-purple-600 dark:text-purple-400">if</span> <span className="text-slate-600 dark:text-slate-300">(!data)</span> <span className="text-purple-600 dark:text-purple-400">return</span> <span className="text-orange-600 dark:text-orange-400">null</span><span className="text-slate-600 dark:text-slate-300">;</span>
                    </div>

                    {/* More Clutter */}
                    <motion.div
                        className="flex items-start bg-red-50 dark:bg-red-900/10 -mx-4 px-4 py-1 my-1 border-l-2 border-red-400"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                    >
                        <span className="text-slate-400 w-6 select-none">4</span>
                        <span className="text-red-500/70 dark:text-red-400/70 italic">// FIXME: This check fails if data is 0. Need to check undefined.</span>
                    </motion.div>
                    <motion.div
                        className="flex items-start bg-red-50 dark:bg-red-900/10 -mx-4 px-4 py-1 my-1 border-l-2 border-red-400"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                    >
                        <span className="text-slate-400 w-6 select-none">5</span>
                        <span className="text-red-500/70 dark:text-red-400/70 italic">// @deprecated: Use new API v2 endpoint instead</span>
                    </motion.div>

                    {/* Code Line */}
                    <div className="flex items-center">
                        <span className="text-slate-400 w-6 select-none">6</span>
                        <span className="text-blue-600 dark:text-blue-400">process</span><span className="text-slate-600 dark:text-slate-300">(data);</span>
                    </div>
                </div>

                {/* Warning Overlay */}
                <motion.div
                    className="absolute top-4 right-4 bg-red-100 dark:bg-red-900/80 text-red-600 dark:text-red-200 px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-lg border border-red-200 dark:border-red-800"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8, type: "spring" }}
                >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Polluted Source
                </motion.div>
            </motion.div>
        </div>
    );
}
