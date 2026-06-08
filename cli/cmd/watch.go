package cmd

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

var watchCmd = &cobra.Command{
	Use:   "watch",
	Short: "Следить за комнатой в реальном времени (WebSocket)",
	Example: `  claytablet watch              # только новые записи
  claytablet watch --all        # показать всё + слушать новое`,
	RunE: func(cmd *cobra.Command, args []string) error {
		showAll, _ := cmd.Flags().GetBool("all")

		fmt.Printf("👁  Слежу за комнатой \"%s\" (Ctrl+C для выхода)\n", client.Room)
		fmt.Println(strings.Repeat("─", 50))

		// Загружаем начальное состояние, запоминаем уже существующие ID
		seenIDs := make(map[string]bool)
		data, err := client.GetRoom(cmd.Context())
		if err != nil {
			return fmt.Errorf("не удалось загрузить комнату: %w", err)
		}

		for _, t := range data.Texts {
			if showAll {
				printWatchItem("TEXT", t.ID, t.Content, t.CreatedAt)
			}
			seenIDs[t.ID] = true
		}
		for _, img := range data.Images {
			name := img.Filename
			if name == "" {
				name = img.URL
			}
			if showAll {
				printWatchItem("IMG ", img.ID, name, img.CreatedAt)
			}
			seenIDs[img.ID] = true
		}
		for _, a := range data.Audios {
			if showAll {
				printWatchItem("AUD ", a.ID, a.URL, a.CreatedAt)
			}
			seenIDs[a.ID] = true
		}
		for _, f := range data.Files {
			if showAll {
				printWatchItem("FILE", f.ID, f.Filename, f.CreatedAt)
			}
			seenIDs[f.ID] = true
		}

		// Слушаем WebSocket, выводим только новые элементы
		return client.Watch(cmd.Context(), func() {
			data, err := client.GetRoom(context.Background())
			if err != nil {
				fmt.Printf("[%s] ошибка: %v\n", timestamp(), err)
				return
			}

			for _, t := range data.Texts {
				if !seenIDs[t.ID] {
					seenIDs[t.ID] = true
					printWatchItem("TEXT", t.ID, t.Content, t.CreatedAt)
				}
			}
			for _, img := range data.Images {
				if !seenIDs[img.ID] {
					seenIDs[img.ID] = true
					name := img.Filename
					if name == "" {
						name = img.URL
					}
					printWatchItem("IMG ", img.ID, name, img.CreatedAt)
				}
			}
			for _, a := range data.Audios {
				if !seenIDs[a.ID] {
					seenIDs[a.ID] = true
					printWatchItem("AUD ", a.ID, a.URL, a.CreatedAt)
				}
			}
			for _, f := range data.Files {
				if !seenIDs[f.ID] {
					seenIDs[f.ID] = true
					printWatchItem("FILE", f.ID, f.Filename, f.CreatedAt)
				}
			}
		})
	},
}

func printWatchItem(kind, id, content, createdAt string) {
	ts := timestamp()
	if len(createdAt) >= 16 {
		ts = createdAt[11:16]
	}

	idShort := id
	if len(idShort) > 8 {
		idShort = idShort[:8]
	}

	preview := strings.ReplaceAll(content, "\n", "↵ ")
	if len([]rune(preview)) > 80 {
		runes := []rune(preview)
		preview = string(runes[:77]) + "..."
	}
	fmt.Printf("[%s] %s  %s  %s\n", ts, kind, idShort, preview)
}

func timestamp() string {
	return time.Now().Format("15:04:05")
}

func init() {
	watchCmd.Flags().Bool("all", false, "показать существующие записи перед началом стрима")
	rootCmd.AddCommand(watchCmd)
}
