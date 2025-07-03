import requests
from bs4 import BeautifulSoup
import time
import json

BASE_URL = "https://html5games.com"
ALL_GAMES_URL = f"{BASE_URL}/All-Games"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

def get_all_game_links():
    response = requests.get(ALL_GAMES_URL, headers=HEADERS)
    soup = BeautifulSoup(response.text, 'html.parser')
    links = []

    for a in soup.select("ul.games li a"):
        href = a.get("href")
        img = a.find("img")
        name = a.find("div", class_="name")

        if href and img and name:
            links.append({
                "title": name.text.strip(),
                "page_url": BASE_URL + href,
                "icon_url": img.get("src")
            })

    return links

def get_game_data(game):
    response = requests.get(game["page_url"], headers=HEADERS)
    soup = BeautifulSoup(response.text, 'html.parser')

    # The playable game link is in the readonly <textarea> with class .aff-iliate-link
    playable_link = soup.select_one("textarea.aff-iliate-link")
    game["iframe_url"] = playable_link.text.strip() if playable_link else None

    return game

def main():
    games_list = get_all_game_links()
    print(f"Found {len(games_list)} games.")

    results = []

    for index, game in enumerate(games_list):
        print(f"[{index+1}/{len(games_list)}] Fetching: {game['title']}")
        try:
            data = get_game_data(game)
            if data["iframe_url"]:
                results.append(data)
        except Exception as e:
            print(f"Error fetching {game['title']}: {e}")
        time.sleep(0.5)

    with open("games/games.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("Game data exported to games/games.json")

if __name__ == "__main__":
    main()
