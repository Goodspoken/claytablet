package cmd

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/spf13/cobra"
)

var copyCmd = &cobra.Command{
	Use:     "copy [номер или id]",
	Aliases: []string{"cp"},
	Short:   "Скопировать текст в буфер обмена",
	Example: `  claytab copy          # последняя запись
  claytab copy 10       # запись №10 из ls
  claytab copy a1b2c3   # по префиксу ID
  claytab copy --last 2 # вторая с конца`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		data, err := client.GetRoom()
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
			return fmt.Errorf("не удалось скопировать: %w\n  Попробуй: claytab show <номер>", err)
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
	if path, err := exec.LookPath("wl-copy"); err == nil {
		cmd := exec.Command(path)
		cmd.Stdin = strings.NewReader(text)
		return cmd.Run()
	}
	if path, err := exec.LookPath("xclip"); err == nil {
		cmd := exec.Command(path, "-selection", "clipboard")
		cmd.Stdin = strings.NewReader(text)
		return cmd.Run()
	}
	if path, err := exec.LookPath("xsel"); err == nil {
		cmd := exec.Command(path, "--clipboard", "--input")
		cmd.Stdin = strings.NewReader(text)
		return cmd.Run()
	}
	if path, err := exec.LookPath("pbcopy"); err == nil {
		cmd := exec.Command(path)
		cmd.Stdin = strings.NewReader(text)
		return cmd.Run()
	}
	return fmt.Errorf("не найдено wl-copy / xclip / xsel / pbcopy")
}

func init() {
	copyCmd.Flags().Int("last", 1, "N-я запись с конца (1 = последняя)")
	rootCmd.AddCommand(copyCmd)
}
