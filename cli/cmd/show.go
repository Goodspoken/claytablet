package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

var showCmd = &cobra.Command{
	Use:   "show <номер или id>",
	Short: "Показать полный текст записи",
	Example: `  dubtab show 1            # первая запись из ls
  dubtab show 3            # третья запись
  dubtab show a1b2c3d4    # по префиксу ID`,
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

		idShort := entry.id
		if len(idShort) > 8 {
			idShort = idShort[:8]
		}
		fmt.Printf("ID:   %s\n", idShort)
		fmt.Printf("Тип:  %s\n", strings.TrimSpace(entry.kind))
		fmt.Println(strings.Repeat("─", 40))
		fmt.Println(entry.content)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(showCmd)
}
