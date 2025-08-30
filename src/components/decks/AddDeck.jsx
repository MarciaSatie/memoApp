import React from 'react'
import { ThemeList } from '@/data/themeList';

export default function AddDeck() {

  return (
    <div>
        <div>
            <input type="text" placeholder="New Deck Title" className="w-full p-2 mb-2 text-greyTxt rounded border-bd bg-background"/>
            <select className="w-full p-2 mb-2 text-greyTxt rounded bg-background border-bd">
                {ThemeList.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                        {theme.icon} {theme.name} Theme
                    </option>
                ))  }
            </select>
        </div>

    </div>
  )
}
