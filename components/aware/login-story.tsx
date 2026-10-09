"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "./logo";
import "./login-story.css";

// Exact, short quotations. Each attribution links to its source.
const quotes = [
  { text: "Learning happens as a consequence of cognitive processing. Cognitive processing is typically effortful, and that’s what AI effectively removes.", author: "Daniel Willingham", url: "https://doi.org/10.1038/d41586-026-02930-6", position: "north-west" },
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein", url: "https://www.pbs.org/wgbh/nova/einstein/wisd-nf.html", position: "south-east" },
  { text: "What I cannot create, I do not understand.", author: "Richard Feynman", url: "https://magazine.caltech.edu/post/biology-through-the-eyes-of-a-physicist", position: "north-east" },
  { text: "My experience is what I agree to attend to.", author: "William James", url: "https://www.gutenberg.org/files/57628/old/57628-h/57628-h.htm", position: "south-west" },
  { text: "Whatever you think about, that’s what you remember. Memory is the residue of thought.", author: "Daniel T. Willingham", url: "https://www.aft.org/ae/summer2021/willingham", position: "north-west" },
  { text: "Learning results from what the student does and thinks and only from what the student does and thinks.", author: "Herbert A. Simon", url: "https://www.cmu.edu/teaching/principles/", position: "south-east" },
  { text: "To be playful and serious at the same time is possible, and it defines the ideal mental condition.", author: "John Dewey", url: "https://www.gutenberg.org/files/37423/37423-h/37423-h.htm", position: "north-east" },
];

export default function LoginStory() {
  const [paused, setPaused] = useState(false);
  return <section className={`login-story thought-story${paused ? " quotes-paused" : ""}`} aria-label="Thoughts on learning">
    <header className="thought-header"><Logo /><span className="thought-header-rule" aria-hidden="true" /></header>
    <div className="thought-stage">
      <div className="thought-lines" aria-hidden="true"><span /><span /><span /></div>
      <div className="thought-center">
        <p className="eyebrow">A SPACE FOR CONSIDERED WRITING</p>
        <h1>Your ideas.<br />Your judgement.<br /><span>Your writing.</span></h1>
        <span className="thought-underline" aria-hidden="true" />
      </div>
      {quotes.map((quote, index) => <figure key={quote.url} className={`thought-quote ${quote.position}`} style={{ animationDelay: `${index * 3.5 - 3}s` }}>
        <blockquote>“{quote.text}”</blockquote>
        <figcaption><a href={quote.url} target="_blank" rel="noreferrer" aria-label={`Read the source for the ${quote.author} quotation`}>{quote.author}</a></figcaption>
      </figure>)}
    </div>
    <footer className="thought-footer">
      <p>Read carefully. Think independently.<br className="thought-footer-break" /> Write with intention.</p>
      <Button variant="ghost" className="thought-pause" onClick={() => setPaused(value => !value)} aria-label={paused ? "Resume quotes" : "Pause quotes"} aria-pressed={paused}>
        {paused ? <Play /> : <Pause />}<span>{paused ? "Resume" : "Pause"}</span>
      </Button>
    </footer>
  </section>;
}
