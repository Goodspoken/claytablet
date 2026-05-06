package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Сохранить настройки (сервер, комната, пароль)",
	Example: `  claytablet config --server https://claytablet.online --room my-room
  claytablet config --server http://localhost:8080 --room test`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if s, _ := cmd.Flags().GetString("server"); s != "" {
			viper.Set("server", s)
		}
		if r, _ := cmd.Flags().GetString("room"); r != "" {
			viper.Set("room", r)
		}
		if p, _ := cmd.Flags().GetString("password"); p != "" {
			viper.Set("password", p)
		}
		if t, _ := cmd.Flags().GetString("token"); t != "" {
			viper.Set("token", t)
		}

		home, err := os.UserHomeDir()
		if err != nil {
			return err
		}
		cfgPath := filepath.Join(home, ".config", "claytablet.toml")
		os.MkdirAll(filepath.Dir(cfgPath), 0755)

		if err := viper.WriteConfigAs(cfgPath); err != nil {
			return fmt.Errorf("не удалось сохранить конфиг: %w", err)
		}

		fmt.Printf("✓ Конфиг сохранён: %s\n", cfgPath)
		fmt.Printf("  server: %s\n", viper.GetString("server"))
		fmt.Printf("  room:   %s\n", viper.GetString("room"))
		return nil
	},
}

func init() {
	configCmd.Flags().String("server", "", "URL сервера")
	configCmd.Flags().String("room", "", "ID комнаты")
	configCmd.Flags().String("password", "", "пароль комнаты")
	configCmd.Flags().String("token", "", "JWT токен")
	rootCmd.AddCommand(configCmd)
}
