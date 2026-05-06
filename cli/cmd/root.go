package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/claytablet/cli/api"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile  string
	client   *api.Client
)

var rootCmd = &cobra.Command{
	Use:   "claytab",
	Short: "ClayTablet CLI — обмен буфером обмена из терминала",
	Long: `claytab — ClayTablet из терминала

КОМНАТА:
  claytab room                   текущая комната
  claytab room <id>              переключиться
  claytab new [id]               создать новую
  claytab rooms                  список твоих комнат (нужен логин)

КОНТЕНТ:
  claytab ls                     список записей
  claytab ls --last 5            последние 5
  claytab send "текст"           отправить текст
  cat file | claytab send        отправить через пайп
  claytab copy                   скопировать последнее в буфер
  claytab show <id>              полный текст по ID
  claytab rm <id>                удалить запись
  claytab clear                  очистить комнату

СТРИМ:
  claytab watch                  следить в реальном времени
  claytab tui                    открыть интерактивную доску (TUI)

АККАУНТ:
  claytab login                  войти через браузер
  claytab logout                 выйти
  claytab me                     кто я

КОНФИГ:
  claytab config --server https://claytablet.online --room my-room`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Не нужен клиент для config команды
		if cmd.Name() == "config" {
			return nil
		}

		server := viper.GetString("server")
		room := viper.GetString("room")
		if server == "" {
			return fmt.Errorf("сервер не задан. Запусти: claytab config --server https://claytablet.online --room my-room")
		}
		if room == "" {
			return fmt.Errorf("комната не задана. Запусти: claytab config --room my-room")
		}

		client = api.New(server, room, viper.GetString("password"), viper.GetString("token"))
		return nil
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "конфиг файл (по умолчанию ~/.config/claytablet.toml)")
	rootCmd.PersistentFlags().String("server", "", "URL сервера (например, https://claytablet.online)")
	rootCmd.PersistentFlags().String("room", "", "ID комнаты")
	rootCmd.PersistentFlags().String("password", "", "пароль комнаты (если защищена)")
	rootCmd.PersistentFlags().String("token", "", "JWT токен для личных комнат")

	viper.BindPFlag("server", rootCmd.PersistentFlags().Lookup("server"))
	viper.BindPFlag("room", rootCmd.PersistentFlags().Lookup("room"))
	viper.BindPFlag("password", rootCmd.PersistentFlags().Lookup("password"))
	viper.BindPFlag("token", rootCmd.PersistentFlags().Lookup("token"))
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		if err == nil {
			viper.AddConfigPath(filepath.Join(home, ".config"))
			viper.AddConfigPath(home)
		}
		viper.SetConfigName("claytablet")
		viper.SetConfigType("toml")
	}

	viper.SetEnvPrefix("CLAYTABLET")
	viper.AutomaticEnv()

	viper.ReadInConfig()
}
