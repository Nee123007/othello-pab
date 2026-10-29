import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path(r"C:\Users\yg159\.gemini\antigravity\brain\40bd8fc6-5180-4be8-9ce9-8a1da608ba8c\screenshots")

ROUTES = [
    ("play", "http://127.0.0.1:5173/play"),
    ("lab", "http://127.0.0.1:5173/lab"),
    ("benchmarks", "http://127.0.0.1:5173/benchmarks"),
    ("about", "http://127.0.0.1:5173/about"),
    ("styleguide", "http://127.0.0.1:5173/styleguide"),
]

VIEWPORTS = [
    ("390", 390, 844),
    ("1024", 1024, 768),
    ("1440", 1440, 900),
]

async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        for name, url in ROUTES:
            for vp_name, width, height in VIEWPORTS:
                page = await browser.new_page(viewport={"width": width, "height": height})
                try:
                    await page.goto(url, wait_until="networkidle", timeout=15000)
                    # Small settle wait for KaTeX / animations
                    await page.wait_for_timeout(800)
                    filename = OUTPUT_DIR / f"{name}_{vp_name}px.png"
                    await page.screenshot(path=str(filename), full_page=True)
                    print(f"Captured {filename.name}")
                except Exception as e:
                    print(f"Error on {name} ({vp_name}px): {e}")
                finally:
                    await page.close()
                    
        await browser.close()
    print("All screenshots completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())

