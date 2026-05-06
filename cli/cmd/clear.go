package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

var clearCmd = &cobra.Command{
	Use:   "clear",
	Short: "Очистить всю комнату",
	Example: `  claytab clear
  claytab clear --yes   # без подтверждения`,
	RunE: func(cmd *cobra.Command, args []string) error {
		yes, _ := cmd.Flags().GetBool("yes")

		if !yes {
			fmt.Printf("Удалить все записи в комнате \"%s\"? [y/N] ", client.Room)
			var ans string
			fmt.Scanln(&ans)
			if strings.ToLower(ans) != "y" {
				fmt.Println("Отменено.")
				return nil
			}
		}

		if err := client.ClearRoom(); err != nil {
			return err
		}
		fmt.Printf("✓ Комната \"%s\" очищена\n", client.Room)
		return nil
	},
}

func init() {
	clearCmd.Flags().BoolP("yes", "y", false, "не спрашивать подтверждение")
	rootCmd.AddCommand(clearCmd)
}
