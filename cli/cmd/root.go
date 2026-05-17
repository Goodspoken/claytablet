package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/Goodspoken/dubtab/cli/api"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/zalando/go-keyring"
)

var (
	cfgFile  string
	client   *api.Client
)

var rootCmd = &cobra.Command{
	Use:   "dubtab",
	Short: "DubTab CLI — обмен буфером обмена из терминала",
	Long: `dubtab — DubTab из терминала

КОМНАТА:
  dubtab room                   текущая комната
  dubtab room <id>              переключиться
  dubtab new [id]               создать новую
  dubtab rooms                  список твоих комнат (нужен логин)

КОНТЕНТ:
  dubtab ls                     список записей
  dubtab ls --last 5            последние 5
  dubtab send "текст"           отправить текст
  cat file | dubtab send        отправить через пайп
  dubtab copy                   скопировать последнее в буфер
  dubtab show <id>              полный текст по ID
  dubtab rm <id>                удалить запись
  dubtab clear                  очистить комнату

СТРИМ:
  dubtab watch                  следить в реальном времени
  dubtab tui                    открыть интерактивную доску (TUI)

АККАУНТ:
  dubtab login                  войти через браузер
  dubtab logout                 выйти
  dubtab me                     кто я

ПЛАГИНЫ:
  dubtab plugin list                     список плагинов сервера
  dubtab plugin config <id>              конфиг плагина
  dubtab plugin config <id> --set '{}'   сохранить конфиг
  dubtab plugin call <id> <path>         вызвать эндпоинт плагина

КОНФИГ:
  dubtab config --server https://dubtab.app --room my-room`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Не нужен клиент для config команды
		if cmd.Name() == "config" {
			return nil
		}

		server := viper.GetString("server")
		room := viper.GetString("room")
		if server == "" {
			return fmt.Errorf("сервер не задан. Запусти: dubtab config --server https://dubtab.app --room my-room")
		}
		if room == "" {
			return fmt.Errorf("комната не задана. Запусти: dubtab config --room my-room")
		}

		password := viper.GetString("password")
		if password == "" {
			if p, err := keyring.Get("dubtab", "password"); err == nil {
				password = p
			}
		}
		token := viper.GetString("token")
		if token == "" {
			if t, err := keyring.Get("dubtab", "token"); err == nil {
				token = t
			}
		}

		client = api.New(server, room, password, token)
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

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "конфиг файл (по умолчанию ~/.config/dubtab.toml)")
	rootCmd.PersistentFlags().String("server", "", "URL сервера (например, https://dubtab.app)")
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
		viper.SetConfigName("dubtab")
		viper.SetConfigType("toml")
	}

	viper.SetEnvPrefix("DUBTAB")
	viper.AutomaticEnv()

	viper.ReadInConfig()
}
