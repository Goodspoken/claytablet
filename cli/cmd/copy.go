package cmd

import (
	"fmt"
	"strings"

	"github.com/atotto/clipboard"
	"github.com/spf13/cobra"
)

var copyCmd = &cobra.Command{
	Use:     "copy [номер или id]",
	Aliases: []string{"cp"},
	Short:   "Скопировать текст в буфер обмена",
	Example: `  dubtab copy          # последняя запись
  dubtab copy 10       # запись №10 из ls
  dubtab copy a1b2c3   # по префиксу ID
  dubtab copy --last 2 # вторая с конца`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		data, err := client.GetRoom(cmd.Context())
		if err != nil {
			return err
		}

		var text string

		if len(args) > 0 {
			entry, err := resolveRef(data, args[0])
			if err != nil {
				return err
			}
			if strings.TrimSpace(entry.kind) != "TEXT" {
				return fmt.Errorf("запись [%s] — %s, можно копировать только TEXT", entry.id[:8], strings.TrimSpace(entry.kind))
			}
			text = entry.content
		} else {
			n, _ := cmd.Flags().GetInt("last")
			if n < 1 {
				n = 1
			}
			if len(data.Texts) == 0 {
				return fmt.Errorf("нет текстовых записей в комнате")
			}
			idx := len(data.Texts) - n
			if idx < 0 {
				return fmt.Errorf("только %d текстовых записей", len(data.Texts))
			}
			text = data.Texts[idx].Content
		}

		if err := CopyToClipboard(text); err != nil {
			return fmt.Errorf("не удалось скопировать: %w\n  Попробуй: dubtab show <номер>", err)
		}

		preview := strings.ReplaceAll(text, "\n", "↵ ")
		if len([]rune(preview)) > 60 {
			preview = string([]rune(preview)[:57]) + "..."
		}
		fmt.Printf("✓ Скопировано: %s\n", preview)
		return nil
	},
}

func CopyToClipboard(text string) error {
	return clipboard.WriteAll(text)
}

func init() {
	copyCmd.Flags().Int("last", 1, "N-я запись с конца (1 = последняя)")
	rootCmd.AddCommand(copyCmd)
}
