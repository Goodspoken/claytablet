package cmd

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var pullCmd = &cobra.Command{
	Use:   "pull <номер или id>",
	Short: "Скачать файл, картинку или аудио",
	Example: `  claytablet pull 1
  claytablet pull a1b2c3d4`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		data, err := client.GetRoom(cmd.Context())
		if err != nil {
			return err
		}

		entry, err := resolveRef(data, args[0])
		if err != nil {
			return err
		}

		if strings.TrimSpace(entry.kind) == "TEXT" {
			return fmt.Errorf("это текстовая запись, используй 'claytablet show' или 'claytablet copy'")
		}

		if entry.item == nil || entry.item.URL == "" {
			return fmt.Errorf("нет URL для скачивания (возможно, файл был удален)")
		}

		filename := entry.item.Filename
		if filename == "" {
			filename = filepath.Base(entry.item.URL)
		}

		outPath, _ := cmd.Flags().GetString("out")
		if outPath == "" {
			outPath = filename
		}

		fmt.Printf("Скачивание %s...\n", outPath)
		url := client.BaseURL + entry.item.URL
		if err := client.DownloadFile(cmd.Context(), url, outPath); err != nil {
			return err
		}

		fmt.Printf("✓ Успешно сохранено: %s\n", outPath)
		return nil
	},
}

func init() {
	pullCmd.Flags().StringP("out", "o", "", "Путь для сохранения файла (по умолчанию: оригинальное имя в текущей папке)")
	rootCmd.AddCommand(pullCmd)
}
