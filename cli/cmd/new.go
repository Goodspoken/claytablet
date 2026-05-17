package cmd

import (
	"fmt"
	"time"

	"github.com/Goodspoken/dubtab/cli/api"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var newCmd = &cobra.Command{
	Use:   "new [id]",
	Short: "Создать новую комнату и переключиться на неё",
	Example: `  dubtab new               # случайный ID
  dubtab new my-room       # конкретный ID`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error { return nil },
	RunE: func(cmd *cobra.Command, args []string) error {
		server := viper.GetString("server")
		if server == "" {
			server = "https://dubtab.app"
		}

		var roomID string
		if len(args) > 0 {
			roomID = args[0]
		} else {
			roomID = fmt.Sprintf("room-%d", time.Now().Unix()%1000000)
		}

		tmpClient := api.New(server, roomID, "", viper.GetString("token"))
		_, err := tmpClient.GetRoom(cmd.Context())
		if err != nil {
			return fmt.Errorf("не удалось создать комнату: %w", err)
		}

		viper.Set("room", roomID)
		if err := viper.WriteConfig(); err != nil {
			return fmt.Errorf("комната создана, но не удалось сохранить конфиг: %w", err)
		}

		fmt.Printf("✓ Комната создана: %s\n", roomID)
		fmt.Printf("  URL: %s/%s\n", server, roomID)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(newCmd)
}
