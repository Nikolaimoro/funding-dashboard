"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    question: "What is funding rate arbitrage?",
    answer:
      "Funding rate arbitrage is a delta-neutral strategy that involves opening opposing positions on different exchanges to capture differences in funding rates. By going long on one exchange and short on another, price exposure is neutralized, while funding payments create a net return.",
  },
  {
    question: "Why do funding rates differ across exchanges?",
    answer:
      "Funding rates vary due to differences in market structure, liquidity and trader positioning across exchanges. When one side of the market dominates, funding payments are used to incentivize traders to take the opposite side and restore balance.",
  },
  {
    question: "Is funding rate arbitrage risk-free?",
    answer:
      "No strategy is completely risk-free. While funding arbitrage removes price risk, it still involves execution risk, liquidity constraints, funding variability, and platform-specific risks such as liquidation mechanics or smart contract exposure on DEXs.",
  },
  {
    question: "How does bendbasis help with funding arbitrage?",
    answer:
      "bendbasis structures funding data across exchanges into a clear, comparable framework. It highlights funding rate differences and historical stability, helping users evaluate delta-neutral opportunities more efficiently. Instead of manually tracking multiple exchanges, bendbasis provides a single view focused on structure, consistency, and decision-making.",
  },
];

export default function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative z-10 pb-24">
      <div className="mx-auto max-w-[1100px] px-8">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <h2 className="text-3xl font-semibold text-[#201D1D]">FAQs</h2>
          <div className="space-y-3 max-w-[720px] justify-self-end">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              const hasAnswer = item.answer.trim().length > 0;
              return (
                <div
                  key={item.question}
                  className="rounded-2xl bg-[#F5F5F5] px-6 py-5"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                    onClick={() => {
                      if (!hasAnswer) return;
                      setOpenIndex((prev) => (prev === index ? null : index));
                    }}
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-medium text-[#201D1D]">
                      {item.question}
                    </span>
                    {hasAnswer && (
                      <span
                        className={`relative h-5 w-5 shrink-0 transition-transform duration-300 ease-out ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#201D1D]" />
                        <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-[#201D1D]" />
                      </span>
                    )}
                  </button>
                  {hasAnswer && (
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="mt-4 text-sm leading-relaxed text-[#5C5854]">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
