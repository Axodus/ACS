import { useEffect, useState } from 'react'

const links = [['Product','#product'],['Architecture','#architecture'],['OpenClaw','#openclaw'],['Developers','#developers']]

export function Header({getStarted}:{getStarted:string}) {
  const [open,setOpen]=useState(false); const [scrolled,setScrolled]=useState(false)
  useEffect(()=>{const fn=()=>setScrolled(scrollY>18); addEventListener('scroll',fn,{passive:true}); return()=>removeEventListener('scroll',fn)},[])
  return <header className={`header ${scrolled?'scrolled':''}`}>
    <a className="brand" href="#top" aria-label="ACS home"><span className="brand-mark">A</span><span>ACS</span></a>
    <nav className="desktop-nav" aria-label="Main navigation">{links.map(([l,h])=><a key={l} href={h}>{l}</a>)}</nav>
    <div className="header-actions"><a className="plain-link" href="#developers">Docs</a><a className="button small" href={getStarted}>Get started <span>↗</span></a></div>
    <button className="menu" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation"><span/><span/></button>
    {open&&<nav className="mobile-nav" aria-label="Mobile navigation">{links.map(([l,h])=><a key={l} href={h} onClick={()=>setOpen(false)}>{l}</a>)}<a href={getStarted}>Get started ↗</a></nav>}
  </header>
}
