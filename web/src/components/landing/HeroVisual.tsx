import { motion } from "framer-motion";
import { FileCode, MessageSquarePlus } from "lucide-react";

export function HeroVisual() {
    return (
        <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
            {/* Background Glow */}
            <div className="absolute -inset-4 bg-brand-orange/20 blur-3xl rounded-full opacity-50 animate-pulse-glow" />

            {/* Mock Editor Window */}
            <motion.div
                className="relative bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                {/* Window Header */}
                <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="ml-4 text-xs text-slate-500 font-mono flex items-center">
                        <FileCode className="w-3 h-3 mr-2" />
                        utils.ts
                    </div>
                </div>

                {/* Code Content */}
                <div className="p-6 font-mono text-sm leading-relaxed text-slate-300">
                    <div className="flex">
                        <span className="text-slate-600 w-8 select-none">1</span>
                        <span className="text-purple-400">export</span> <span className="text-blue-400 ml-2">function</span> <span className="text-yellow-300 ml-2">calculateTotal</span><span className="text-slate-400">(</span><span className="text-slate-300">items</span><span className="text-slate-400">)</span> <span className="text-slate-400">{`{`}</span>
                    </div>
                    <div className="flex">
                        <span className="text-slate-600 w-8 select-none">2</span>
                        <span className="ml-4 text-purple-400">return</span> <span className="text-slate-300 ml-2">items.</span><span className="text-blue-400">reduce</span><span className="text-slate-400">((</span><span className="text-slate-300">acc, item</span><span className="text-slate-400">)</span> <span className="text-blue-400">=&gt;</span> <span className="text-slate-300">acc + item.price, </span><span className="text-orange-400">0</span><span className="text-slate-400">);</span>
                    </div>
                    <div className="flex relative group py-1">
                        <span className="text-slate-600 w-8 select-none">3</span>
                        <span className="text-slate-400">{'}'}</span>

                        {/* Animated Note */}
                        <motion.div
                            className="absolute left-24 top-0 z-10 bg-[#F4F1E9] text-[#0B1220] p-3 rounded-lg shadow-xl border-l-4 border-[#FF8A3D] w-[220px]"
                            initial={{ opacity: 0, scale: 0.8, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ delay: 1.5, duration: 0.5 }}
                        >
                            <div className="flex items-start space-x-2">
                                <MessageSquarePlus className="w-4 h-4 text-[#FF8A3D] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold mb-0.5">Refactor needed</p>
                                    <p className="text-[10px] leading-tight opacity-80">Add tax calculation logic here before returning the final total.</p>
                                </div>
                            </div>
                            {/* Connector Line */}
                            <div className="absolute top-4 -left-3 w-3 h-px bg-[#FF8A3D]/50" />
                            <div className="absolute top-4 -left-3 w-1.5 h-1.5 rounded-full bg-[#FF8A3D]" />
                        </motion.div>
                    </div>
                    <div className="flex">
                        <span className="text-slate-600 w-8 select-none">4</span>
                    </div>
                    <div className="flex">
                        <span className="text-slate-600 w-8 select-none">5</span>
                        <span className="text-slate-500">// End of file</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
