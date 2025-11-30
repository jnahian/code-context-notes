import { motion } from "framer-motion";
import { FileCode, CheckCircle, ArrowRight } from "lucide-react";

export function SolutionVisual() {
    return (
        <div className="relative w-full max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-4">

                {/* Clean File Window */}
                <motion.div
                    className="relative flex-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Header */}
                    <div className="flex items-center px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                        <div className="flex space-x-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                        </div>
                        <div className="ml-3 text-xs text-slate-500 font-mono flex items-center">
                            <FileCode className="w-3 h-3 mr-1.5" />
                            clean_component.ts
                        </div>
                    </div>

                    {/* Clean Code Content */}
                    <div className="p-4 font-mono text-xs leading-relaxed">
                        <div className="flex items-center">
                            <span className="text-slate-400 w-6 select-none">1</span>
                            <span className="text-purple-600 dark:text-purple-400">const</span> <span className="text-blue-600 dark:text-blue-400 ml-2">data</span> <span className="text-slate-600 dark:text-slate-300">=</span> <span className="text-slate-600 dark:text-slate-300">fetchData();</span>
                        </div>
                        <div className="flex items-center bg-brand-orange/10 -mx-4 px-4 border-l-2 border-brand-orange">
                            <span className="text-slate-400 w-6 select-none">2</span>
                            <span className="text-purple-600 dark:text-purple-400">if</span> <span className="text-slate-600 dark:text-slate-300">(!data)</span> <span className="text-purple-600 dark:text-purple-400">return</span> <span className="text-orange-600 dark:text-orange-400">null</span><span className="text-slate-600 dark:text-slate-300">;</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-slate-400 w-6 select-none">3</span>
                            <span className="text-blue-600 dark:text-blue-400">process</span><span className="text-slate-600 dark:text-slate-300">(data);</span>
                        </div>
                    </div>

                    {/* Success Badge */}
                    <motion.div
                        className="absolute bottom-2 right-2 bg-green-100 dark:bg-green-900/80 text-green-700 dark:text-green-300 px-2 py-1 rounded text-[10px] font-bold flex items-center shadow-sm"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 }}
                    >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Clean
                    </motion.div>
                </motion.div>

                {/* Connector */}
                <motion.div
                    className="hidden md:flex flex-col items-center justify-center text-brand-orange"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="h-px w-8 bg-brand-orange/30 dashed" />
                    <div className="p-1.5 rounded-full bg-brand-orange/10 border border-brand-orange/30">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                    <div className="h-px w-8 bg-brand-orange/30 dashed" />
                </motion.div>

                {/* External Note Window */}
                <motion.div
                    className="relative flex-1 w-full bg-[#F4F1E9] border border-[#E5E0D1] rounded-xl shadow-xl overflow-hidden transform rotate-1"
                    initial={{ opacity: 0, x: 20, rotate: 3 }}
                    whileInView={{ opacity: 1, x: 0, rotate: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {/* Note Header */}
                    <div className="flex items-center px-4 py-2 border-b border-[#E5E0D1] bg-[#EBE7DC]">
                        <div className="text-xs text-[#5C5544] font-bold uppercase tracking-wider">
                            Context Note
                        </div>
                    </div>

                    {/* Note Content */}
                    <div className="p-4 text-xs text-[#0B1220] leading-relaxed font-sans">
                        <p className="font-bold mb-1 text-[#FF8A3D]">Refactor Plan</p>
                        <p className="mb-2 opacity-80">This null check is temporary. We need to update the API client to handle 404s gracefully.</p>
                        <div className="flex items-center text-[10px] text-slate-400 mt-3 border-t border-[#E5E0D1] pt-2">
                            <div className="w-4 h-4 rounded-full bg-slate-300 mr-2" />
                            <span>Added by @jnahian • 2h ago</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
