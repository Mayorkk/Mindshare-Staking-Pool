/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/mindshare_staking_pool.json`.
 */
export type MindshareStakingPool = {
  "address": "CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd",
  "metadata": {
    "name": "mindshareStakingPool",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimRewards",
      "discriminator": [
        4,
        144,
        132,
        71,
        116,
        23,
        151,
        80
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "userStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "user_stake.user",
                "account": "userStake"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "rewardVault",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "createPool",
      "discriminator": [
        233,
        146,
        209,
        142,
        207,
        104,
        64,
        188
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "poolId"
              }
            ]
          }
        },
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "poolId",
          "type": "u64"
        },
        {
          "name": "maxStakeAmount",
          "type": "u64"
        },
        {
          "name": "minLockPeriod",
          "type": "i64"
        },
        {
          "name": "slashingRate",
          "type": "u16"
        },
        {
          "name": "baseRewardRate",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initPoolVault",
      "discriminator": [
        202,
        16,
        192,
        207,
        207,
        57,
        145,
        224
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "poolVault"
        }
      ],
      "args": [
        {
          "name": "poolId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initRewardVault",
      "discriminator": [
        183,
        229,
        185,
        247,
        110,
        114,
        179,
        1
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "rewardVault"
        }
      ],
      "args": [
        {
          "name": "poolId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "userStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "poolVault",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "lockDuration",
          "type": "i64"
        }
      ]
    },
    {
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "userStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "userStake"
          ]
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "poolVault",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "programState",
      "discriminator": [
        77,
        209,
        137,
        229,
        149,
        67,
        167,
        230
      ]
    },
    {
      "name": "stakingPool",
      "discriminator": [
        203,
        19,
        214,
        220,
        220,
        154,
        24,
        102
      ]
    },
    {
      "name": "userStake",
      "discriminator": [
        102,
        53,
        163,
        107,
        9,
        138,
        87,
        153
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6001,
      "name": "invalidLockPeriod",
      "msg": "Invalid lock period"
    },
    {
      "code": 6002,
      "name": "poolCapacityExceeded",
      "msg": "Pool capacity exceeded"
    },
    {
      "code": 6003,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6004,
      "name": "insufficientStake",
      "msg": "Insufficient stake"
    },
    {
      "code": 6005,
      "name": "stakeSlashed",
      "msg": "Stake slashed"
    },
    {
      "code": 6006,
      "name": "invalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6007,
      "name": "poolInactive",
      "msg": "Pool inactive"
    },
    {
      "code": 6008,
      "name": "invalidPool",
      "msg": "Invalid pool"
    },
    {
      "code": 6009,
      "name": "invalidPoolVault",
      "msg": "Invalid pool vault"
    },
    {
      "code": 6010,
      "name": "programPaused",
      "msg": "Program paused"
    },
    {
      "code": 6011,
      "name": "invalidTimestamp",
      "msg": "Timestamp error"
    },
    {
      "code": 6012,
      "name": "mathOverflow",
      "msg": "Math overflow"
    }
  ],
  "types": [
    {
      "name": "programState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "totalPools",
            "type": "u64"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stakingPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolId",
            "type": "u64"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "poolVault",
            "type": "pubkey"
          },
          {
            "name": "rewardVault",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "maxStakeAmount",
            "type": "u64"
          },
          {
            "name": "currentStaked",
            "type": "u64"
          },
          {
            "name": "minLockPeriod",
            "type": "i64"
          },
          {
            "name": "slashingRate",
            "type": "u16"
          },
          {
            "name": "baseRewardRate",
            "type": "u64"
          },
          {
            "name": "performanceMultiplier",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userStake",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "poolId",
            "type": "u64"
          },
          {
            "name": "stakeAmount",
            "type": "u64"
          },
          {
            "name": "lockDuration",
            "type": "i64"
          },
          {
            "name": "stakedAt",
            "type": "i64"
          },
          {
            "name": "lockUntil",
            "type": "i64"
          },
          {
            "name": "lastClaimed",
            "type": "i64"
          },
          {
            "name": "pendingRewards",
            "type": "u64"
          },
          {
            "name": "isSlashed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
