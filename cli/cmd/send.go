package cmd

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var sendCmd = &cobra.Command{
	Use:   "send [текст]",
	Short: "Отправить текст в комнату",
	Example: `  claytablet send "привет мир"
  cat error.log | claytablet send
  echo "$(git log --oneline -5)" | claytablet send`,
	RunE: func(cmd *cobra.Command, args []string) error {
		filePath, _ := cmd.Flags().GetString("file")
		if filePath != "" {
			item, err := client.UploadFile(cmd.Context(), filePath)
			if err != nil {
				return err
			}
			fmt.Printf("✓ Файл отправлен [%s]: %s\n", item.ID[:8], filepath.Base(filePath))
			return nil
		}

		var content string

		// Если передан аргумент — используем его
		if len(args) > 0 {
			content = strings.Join(args, " ")
		} else {
			// Иначе читаем из stdin (пайп)
			stat, _ := os.Stdin.Stat()
			if (stat.Mode() & os.ModeCharDevice) != 0 {
				return fmt.Errorf("нет текста: передай аргумент или используй пайп (cat file | claytablet send)")
			}
			b, err := io.ReadAll(os.Stdin)
			if err != nil {
				return fmt.Errorf("ошибка чтения stdin: %w", err)
			}
			content = strings.TrimRight(string(b), "\n")
		}

		if content == "" {
			return fmt.Errorf("пустой текст — нечего отправлять")
		}

		item, err := client.SendText(cmd.Context(), content)
		if err != nil {
			return err
		}

		// Короткий превью для вывода
		preview := content
		if len(preview) > 60 {
			preview = preview[:57] + "..."
		}
		fmt.Printf("✓ Отправлено [%s]: %s\n", item.ID[:8], preview)
		return nil
	},
}

func init() {
	sendCmd.Flags().StringP("file", "f", "", "Путь к файлу для отправки")
	rootCmd.AddCommand(sendCmd)
}
