package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var roomCmd = &cobra.Command{
	Use:   "room [id]",
	Short: "Переключиться на комнату или показать текущую",
	Example: `  claytablet room                  # показать текущую комнату
  claytablet room fc0f6029b5        # переключиться на комнату
  claytablet room illz              # переключиться по имени`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error { return nil },
	RunE: func(cmd *cobra.Command, args []string) error {
		if len(args) == 0 {
			current := viper.GetString("room")
			server := viper.GetString("server")
			if current == "" {
				fmt.Println("Текущая комната не задана. Используй: claytablet room <id>")
			} else {
				fmt.Printf("Текущая комната: %s\n", current)
				fmt.Printf("URL: %s/%s\n", server, current)
			}
			return nil
		}

		roomID := args[0]
		viper.Set("room", roomID)
		if err := viper.WriteConfig(); err != nil {
			return fmt.Errorf("не удалось сохранить конфиг: %w", err)
		}
		fmt.Printf("✓ Переключился на комнату: %s\n", roomID)
		fmt.Printf("  URL: %s/%s\n", viper.GetString("server"), roomID)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(roomCmd)
}
