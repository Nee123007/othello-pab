import csv
import json
from pathlib import Path

def parse_val(val: str):
    val = val.strip()
    if val == "":
        return None
    try:
        if "." in val or "e" in val.lower():
            return float(val)
        return int(val)
    except ValueError:
        return val

def convert_csv_to_json(csv_path: Path, json_path: Path):
    if not csv_path.exists():
        print(f"Skipping {csv_path} (does not exist)")
        return
    
    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed_row = {k: parse_val(v) for k, v in row.items()}
            rows.append(parsed_row)
            
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)
    print(f"Converted {csv_path.name} -> {json_path} ({len(rows)} records)")

def main():
    root = Path(__file__).resolve().parent.parent
    results_dir = root / "results"
    output_dir = root / "web" / "public" / "data"

    files = [
        "summary.csv",
        "failure.csv",
        "tournament.csv",
        "tournament_games.csv",
    ]

    for fname in files:
        csv_file = results_dir / fname
        json_file = output_dir / fname.replace(".csv", ".json")
        convert_csv_to_json(csv_file, json_file)

if __name__ == "__main__":
    main()

