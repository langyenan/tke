import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { bindActionCreators, insertCSS } from '@tencent/qcloud-lib';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { dateFormat } from '../../../../../helpers/dateUtil';
import { router } from '../../router';
import { allActions } from '../../actions';
import { Button, Modal, Card, Input, Form, TableColumn } from '@tea/component';
import { VALIDATE_PHONE_RULE, VALIDATE_EMAIL_RULE, STRATEGY_TYPE } from '../../constants/Config';
import { Strategy } from '../../models';
import { TablePanel, emptyTips, LinkButton } from '@src/modules/common';
const { useState, useEffect, useRef } = React;
const _isEqual = require('lodash/isEqual');

insertCSS(
  'UserDetailsPanel',
  `
    .item-descr-list .is-error {
      color: #e1504a;
      border-color: #e1504a;
    }
`
);

export const UserDetailsPanel = () => {
  const state = useSelector(state => state);
  const dispatch = useDispatch();
  const { actions } = bindActionCreators({ actions: allActions }, dispatch);

  const { route, userList, getUser, updateUser, userStrategyList } = state;
  const getUserData = getUser.data[0];
  const updateUserData = updateUser.data[0];
  const { sub } = router.resolve(route);

  const [basicParamsValue, setBasicParamsValue] = useState({ displayName: '', email: '', phoneNumber: '' });
  const [editValue, setEditValue] = useState({ editBasic: false });
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    // 请求用户详情
    actions.user.getUser.fetch({
      noCache: true,
      data: { name: sub }
    });

    // 进行用户绑定的策略的拉取
    actions.user.strategy.applyFilter({ specificName: sub });
  }, []);

  useEffect(() => {
    // 初始化用户详情
    if (getUserData && getUserData.target.name === sub) {
      const showUser = getUserData.target;
      const { displayName = '', email = '', phoneNumber = '' } = showUser.Spec.extra;
      setUser(showUser);
      setBasicParamsValue({ displayName, email, phoneNumber });
    }
  }, [getUserData, sub]);

  useEffect(() => {
    // 更新user后修改state数据: 有个坑 —— 上边初始化用户详情后，下边user会变更，如果updateUserData存储有以往的旧数据，就会在里边setUser旧数据
    if (updateUserData && updateUserData.success && !_isEqual(user, updateUserData.target)) {
      const showUser = updateUserData.target;
      setUser(showUser);
    }
  }, [updateUserData]);

  const { displayName, phoneNumber, email } = basicParamsValue;
  const isNameError = displayName.length <= 0 || displayName.length > 255;
  const { displayName: pDisplayName = '', phoneNumber: pPhoneNumber = '', email: pEmail = '' } = user
    ? user.Spec.extra
    : {};

  // 都满足，确定才可用
  const enabled =
    (pDisplayName !== displayName || pPhoneNumber !== phoneNumber || pEmail !== email) &&
    !isNameError &&
    (!phoneNumber || VALIDATE_PHONE_RULE.pattern.test(phoneNumber)) &&
    (!email || VALIDATE_EMAIL_RULE.pattern.test(email));

  const columns: TableColumn<Strategy>[] = [
    {
      key: 'name',
      header: t('策略名'),
      width: '20%',
      render: x => x.name
    },
    {
      key: 'desp',
      header: t('描述'),
      width: '40%',
      render: x => x.description
    },
    {
      key: 'type',
      header: t('类型'),
      width: '20%',
      render: x => STRATEGY_TYPE[x.type]
    }
  ];

  return (
    <React.Fragment>
      <Card>
        <Card.Body
          title={t('基本信息')}
          subtitle={
            <Button type="link" onClick={_onBasicEdit}>
              编辑
            </Button>
          }
        >
          {user && (
            <ul className="item-descr-list">
              <li>
                <span className="item-descr-tit">用户账号</span>
                <span className="item-descr-txt">{user.name}</span>
              </li>
              <li>
                <span className="item-descr-tit">用户名称</span>
                {editValue.editBasic ? (
                  <React.Fragment>
                    <Input
                      value={displayName}
                      className={isNameError && 'is-error'}
                      onChange={value => {
                        setBasicParamsValue({ ...basicParamsValue, displayName: value });
                      }}
                    />
                    {isNameError ? <p className="is-error">输入不能为空且需要小于256个字符</p> : ''}
                  </React.Fragment>
                ) : (
                  <span className="item-descr-txt">{user.Spec.extra.displayName}</span>
                )}
              </li>
              <li>
                <span className="item-descr-tit">手机号</span>
                {editValue.editBasic ? (
                  <React.Fragment>
                    <Input
                      value={phoneNumber}
                      onChange={value => {
                        setBasicParamsValue({ ...basicParamsValue, phoneNumber: value });
                      }}
                    />
                    {VALIDATE_PHONE_RULE.pattern.test(phoneNumber) || !phoneNumber ? (
                      ''
                    ) : (
                      <p className="is-error">{VALIDATE_PHONE_RULE.message}</p>
                    )}
                  </React.Fragment>
                ) : (
                  <span className="item-descr-txt">{user.Spec.extra.phoneNumber || '-'}</span>
                )}
              </li>
              <li>
                <span className="item-descr-tit">邮箱</span>
                {editValue.editBasic ? (
                  <React.Fragment>
                    <Input
                      value={email}
                      onChange={value => {
                        setBasicParamsValue({ ...basicParamsValue, email: value });
                      }}
                    />
                    {VALIDATE_EMAIL_RULE.pattern.test(email) || !email ? (
                      ''
                    ) : (
                      <p className="is-error">{VALIDATE_EMAIL_RULE.message}</p>
                    )}
                  </React.Fragment>
                ) : (
                  <span className="item-descr-txt">{user.Spec.extra.email || '-'}</span>
                )}
              </li>
              <li>
                <span className="item-descr-tit">创建时间</span>
                <span className="item-descr-txt">{dateFormat(new Date(user.createAt), 'yyyy-MM-dd hh:mm:ss')}</span>
              </li>
              <li>
                <span className="item-descr-tit">更新时间</span>
                <span className="item-descr-txt">{dateFormat(new Date(user.updateAt), 'yyyy-MM-dd hh:mm:ss')}</span>
              </li>
            </ul>
          )}
          {editValue.editBasic && (
            <div>
              <Button type="primary" disabled={!enabled} onClick={_onSubmitBasic}>
                保存
              </Button>
              <Button style={{ marginLeft: '10px' }} onClick={_onCancelBasicEdit}>
                取消
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Body title={t('关联策略')}>
          <TablePanel
            isNeedCard={false}
            columns={columns}
            model={userStrategyList}
            action={actions.user.strategy}
            emptyTips={emptyTips}
          />
        </Card.Body>
      </Card>
    </React.Fragment>
  );

  function _onBasicEdit() {
    setEditValue({ editBasic: true });
  }

  async function _onSubmitBasic() {
    const { displayName, phoneNumber, email } = basicParamsValue;

    await actions.user.updateUser.fetch({
      noCache: true,
      data: {
        user: {
          name: user.name,
          Spec: {
            extra: {
              displayName,
              phoneNumber,
              email
            }
          }
        }
      }
    });
    setEditValue({ editBasic: false });
  }

  function _onCancelBasicEdit() {
    setEditValue({ editBasic: false });
  }
};
