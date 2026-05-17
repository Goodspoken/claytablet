package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/zalando/go-keyring"
)

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Выйти из аккаунта (удалить токен)",
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error { return nil },
	RunE: func(cmd *cobra.Command, args []string) error {
		token, err := keyring.Get("dubtab", "token")
		if err != nil && viper.GetString("token") == "" {
			fmt.Println("Ты и так не авторизован.")
			return nil
		}

		keyring.Delete("dubtab", "token")
		viper.Set("token", "")
		if err := viper.WriteConfig(); err != nil {
			home, _ := os.UserHomeDir()
			viper.WriteConfigAs(home + "/.config/dubtab.toml")
		}

		fmt.Println("✓ Токен удалён. До свидания!")
		return nil
	},
}

func init() {
	rootCmd.AddCommand(logoutCmd)
}
