package cmd

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
)

var (
	getLast    int
	getRaw     bool
	getFull    bool
	getType    string
)

var getCmd = &cobra.Command{
	Use:     "get",
	Aliases: []string{"ls"},
	Short:   "Получить содержимое комнаты",
	Example: `  claytablet ls
  claytablet ls --last 5
  claytablet ls --full              # показать полный текст каждой заметки
  claytablet ls --last 1 --raw | xclip -sel clip  # скопировать последний текст`,
	RunE: func(cmd *cobra.Command, args []string) error {
		data, err := client.GetRoom(cmd.Context())
		if err != nil {
			return err
		}

		type entry struct {
			id        string
			kind      string
			content   string
			createdAt string
		}

		var all []entry

		for _, t := range data.Texts {
			all = append(all, entry{t.ID, "TEXT", t.Content, t.CreatedAt})
		}
		for _, img := range data.Images {
			name := img.Filename
			if name == "" {
				name = img.URL
			}
			all = append(all, entry{img.ID, "IMG ", name, img.CreatedAt})
		}
		for _, a := range data.Audios {
			all = append(all, entry{a.ID, "AUD ", a.URL, a.CreatedAt})
		}
		for _, f := range data.Files {
			all = append(all, entry{f.ID, "FILE", f.Filename, f.CreatedAt})
		}

		// Фильтр по типу
		if getType != "" {
			typeFilter := strings.ToUpper(getType)
			var filtered []entry
			for _, e := range all {
				if strings.HasPrefix(strings.TrimSpace(e.kind), typeFilter) {
					filtered = append(filtered, e)
				}
			}
			all = filtered
		}

		if len(all) == 0 {
			fmt.Println("Комната пуста.")
			return nil
		}

		// Ограничение --last N (API отдаёт новые первыми)
		if getLast > 0 && getLast < len(all) {
			all = all[:getLast]
		}

		if getRaw {
			// Только контент, без форматирования — удобно для пайпов
			for _, e := range all {
				fmt.Println(e.content)
			}
			return nil
		}

		if getFull {
			// Полный текст с разделителями
			for i, e := range all {
				ts := ""
				if len(e.createdAt) >= 16 {
					ts = e.createdAt[11:16]
				}
				fmt.Printf("─── [%d] %s  %s  %s ───\n", i+1, e.id[:8], ts, strings.TrimSpace(e.kind))
				fmt.Println(e.content)
				fmt.Println()
			}
			return nil
		}

		// Красивый компактный вывод
		numWidth := len(strconv.Itoa(len(all)))
		fmt.Printf("┌─ Комната: %s (%d записей) ─\n", client.Room, len(all))
		for i, e := range all {
			ts := ""
			if len(e.createdAt) >= 16 {
				ts = e.createdAt[11:16]
			}

			preview := e.content
			if len(preview) > 55 {
				preview = preview[:52] + "..."
			}
			preview = strings.ReplaceAll(preview, "\n", "↵ ")

			connector := "├"
			if i == len(all)-1 {
				connector = "└"
			}
			num := fmt.Sprintf("%*d.", numWidth, i+1)
			fmt.Printf("%s %s [%s] %s  %s  %s\n", connector, num, e.id[:8], ts, e.kind, preview)
		}
		return nil
	},
}

func init() {
	getCmd.Flags().IntVar(&getLast, "last", 0, "показать последние N записей")
	getCmd.Flags().BoolVar(&getRaw, "raw", false, "только контент, без форматирования (для пайпов)")
	getCmd.Flags().BoolVar(&getFull, "full", false, "показать полный текст (не обрезать)")
	getCmd.Flags().StringVar(&getType, "type", "", "фильтр по типу: text, img, aud, file")
	rootCmd.AddCommand(getCmd)
}
